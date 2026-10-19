// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AirPaySettlement
 * @notice Non-custodial payment settlement for AirPay. Each merchant (a
 *         workspace/organization) is registered on-chain with a payout address
 *         and a per-merchant platform fee in basis points. When a payer settles
 *         a payment, the fee is forwarded to the AirPay treasury and the
 *         remainder is pushed straight to the merchant's payout address. The
 *         contract never holds funds after a call returns.
 *
 *         Fees default to 0.90% (90 bps) and are controlled solely by the
 *         AirPay owner account; merchants cannot change their own rate.
 */
contract AirPaySettlement is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Basis-point denominator (100% == 10_000 bps).
    uint16 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Fee applied to merchants registered without an explicit rate.
    uint16 public constant DEFAULT_FEE_BPS = 90; // 0.90%

    /// @notice Hard ceiling on any merchant fee (10.00%).
    uint16 public constant MAX_FEE_BPS = 1_000;

    struct Merchant {
        address payout;
        uint16 feeBps;
        bool active;
    }

    /// @notice Destination for platform fees.
    address public treasury;

    mapping(bytes32 merchantId => Merchant) private _merchants;

    // --- events -----------------------------------------------------------

    event TreasuryUpdated(address indexed treasury);
    event MerchantRegistered(bytes32 indexed merchantId, address indexed payout, uint16 feeBps);
    event MerchantUpdated(bytes32 indexed merchantId, address indexed payout, uint16 feeBps, bool active);
    event PausedSet(bool paused);

    /// @notice Emitted for every settled payment. `token == address(0)` means the
    ///         native asset. `ref` is an off-chain reconciliation id (the AirPay
    ///         payment-intent reference).
    event Settled(
        bytes32 indexed merchantId,
        bytes32 indexed ref,
        address indexed payer,
        address token,
        uint256 gross,
        uint256 fee,
        uint256 net,
        address payout
    );

    // --- errors -----------------------------------------------------------

    error ZeroAddress();
    error InvalidFee(uint16 feeBps, uint16 max);
    error MerchantAlreadyRegistered(bytes32 merchantId);
    error MerchantNotRegistered(bytes32 merchantId);
    error MerchantNotActive(bytes32 merchantId);
    error NothingToSettle();
    error NativeTransferFailed();

    /// @dev OZ `Ownable` rejects a zero `initialOwner` before this body runs.
    constructor(address initialOwner, address initialTreasury) Ownable(initialOwner) {
        if (initialTreasury == address(0)) revert ZeroAddress();
        treasury = initialTreasury;
        emit TreasuryUpdated(initialTreasury);
    }

    // --- admin ------------------------------------------------------------

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function registerMerchant(bytes32 merchantId, address payout, uint16 feeBps) external onlyOwner {
        if (_merchants[merchantId].payout != address(0)) revert MerchantAlreadyRegistered(merchantId);
        _validatePayout(payout);
        _validateFee(feeBps);
        _merchants[merchantId] = Merchant({payout: payout, feeBps: feeBps, active: true});
        emit MerchantRegistered(merchantId, payout, feeBps);
    }

    /// @notice Idempotent register-or-update used by the AirPay sync worker, so a
    ///         settings save can call a single method regardless of prior state.
    function upsertMerchant(bytes32 merchantId, address payout, uint16 feeBps) external onlyOwner {
        _validatePayout(payout);
        _validateFee(feeBps);

        Merchant storage m = _merchants[merchantId];
        if (m.payout == address(0)) {
            _merchants[merchantId] = Merchant({payout: payout, feeBps: feeBps, active: true});
            emit MerchantRegistered(merchantId, payout, feeBps);
        } else {
            m.payout = payout;
            m.feeBps = feeBps;
            m.active = true;
            emit MerchantUpdated(merchantId, payout, feeBps, true);
        }
    }

    function setMerchantPayout(bytes32 merchantId, address payout) external onlyOwner {
        _validatePayout(payout);
        Merchant storage m = _requireRegistered(merchantId);
        m.payout = payout;
        emit MerchantUpdated(merchantId, payout, m.feeBps, m.active);
    }

    function setMerchantFee(bytes32 merchantId, uint16 feeBps) external onlyOwner {
        _validateFee(feeBps);
        Merchant storage m = _requireRegistered(merchantId);
        m.feeBps = feeBps;
        emit MerchantUpdated(merchantId, m.payout, feeBps, m.active);
    }

    function setMerchantActive(bytes32 merchantId, bool active) external onlyOwner {
        Merchant storage m = _requireRegistered(merchantId);
        m.active = active;
        emit MerchantUpdated(merchantId, m.payout, m.feeBps, active);
    }

    function pause() external onlyOwner {
        _pause();
        emit PausedSet(true);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit PausedSet(false);
    }

    /// @notice Emergency recovery of funds accidentally left in the contract.
    ///         Only callable while paused, so it cannot interfere with live flow.
    function rescue(address token, address to, uint256 amount) external onlyOwner whenPaused {
        if (to == address(0)) revert ZeroAddress();
        if (token == address(0)) {
            // forge-lint: disable-next-line(arbitrary-send-eth) owner-gated, paused-only recovery
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // --- payments ---------------------------------------------------------

    /// @notice Settle a native-asset payment for `merchantId`.
    /// @param merchantId Registered merchant id.
    /// @param ref Off-chain payment reference (AirPay intent id hash).
    function payNative(bytes32 merchantId, bytes32 ref) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert NothingToSettle();
        Merchant memory m = _requireActive(merchantId);

        (uint256 fee, uint256 net) = _split(msg.value, m.feeBps);

        emit Settled(merchantId, ref, msg.sender, address(0), msg.value, fee, net, m.payout);

        if (fee > 0) _sendNative(treasury, fee);
        if (net > 0) _sendNative(m.payout, net);
    }

    /// @notice Settle an ERC-20 payment for `merchantId`. The caller must first
    ///         approve this contract for at least `gross`.
    /// @param merchantId Registered merchant id.
    /// @param token ERC-20 token contract (e.g. testnet USDC).
    /// @param gross Amount to pull from the payer.
    /// @param ref Off-chain payment reference (AirPay intent id hash).
    function payToken(bytes32 merchantId, address token, uint256 gross, bytes32 ref)
        external
        nonReentrant
        whenNotPaused
    {
        if (token == address(0)) revert ZeroAddress();
        if (gross == 0) revert NothingToSettle();
        Merchant memory m = _requireActive(merchantId);

        (uint256 fee, uint256 net) = _split(gross, m.feeBps);

        emit Settled(merchantId, ref, msg.sender, token, gross, fee, net, m.payout);

        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), gross);
        if (fee > 0) erc20.safeTransfer(treasury, fee);
        if (net > 0) erc20.safeTransfer(m.payout, net);
    }

    // --- views ------------------------------------------------------------

    function merchant(bytes32 merchantId) external view returns (address payout, uint16 feeBps, bool active) {
        Merchant memory m = _merchants[merchantId];
        return (m.payout, m.feeBps, m.active);
    }

    function isRegistered(bytes32 merchantId) external view returns (bool) {
        return _merchants[merchantId].payout != address(0);
    }

    /// @notice Fee/net split for a gross amount under a merchant's current rate.
    function quote(bytes32 merchantId, uint256 gross) external view returns (uint256 fee, uint256 net) {
        Merchant memory m = _merchants[merchantId];
        if (m.payout == address(0)) revert MerchantNotRegistered(merchantId);
        return _split(gross, m.feeBps);
    }

    // --- internals --------------------------------------------------------

    function _split(uint256 gross, uint16 feeBps) internal pure returns (uint256 fee, uint256 net) {
        fee = (gross * uint256(feeBps)) / BPS_DENOMINATOR;
        net = gross - fee;
    }

    function _sendNative(address to, uint256 amount) private {
        // forge-lint: disable-next-line(arbitrary-send-eth) to == owner-configured treasury or merchant payout
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }

    function _requireRegistered(bytes32 merchantId) private view returns (Merchant storage m) {
        m = _merchants[merchantId];
        if (m.payout == address(0)) revert MerchantNotRegistered(merchantId);
    }

    function _requireActive(bytes32 merchantId) private view returns (Merchant memory m) {
        m = _merchants[merchantId];
        if (m.payout == address(0)) revert MerchantNotRegistered(merchantId);
        if (!m.active) revert MerchantNotActive(merchantId);
    }

    function _validatePayout(address payout) private pure {
        if (payout == address(0)) revert ZeroAddress();
    }

    function _validateFee(uint16 feeBps) private pure {
        if (feeBps > MAX_FEE_BPS) revert InvalidFee(feeBps, MAX_FEE_BPS);
    }
}
