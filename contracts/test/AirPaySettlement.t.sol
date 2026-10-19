// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {AirPaySettlement} from "../src/AirPaySettlement.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Payout address that tries to re-enter `payNative` on receipt.
contract ReentrantPayout {
    AirPaySettlement public settlement;
    bytes32 public id;
    bool private _entered;

    constructor(AirPaySettlement _settlement, bytes32 _id) {
        settlement = _settlement;
        id = _id;
    }

    receive() external payable {
        if (!_entered) {
            _entered = true;
            settlement.payNative{value: 1}(id, bytes32(0));
        }
    }
}

contract AirPaySettlementTest is Test {
    AirPaySettlement internal settlement;
    MockERC20 internal usdc;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal merchantPayout = makeAddr("merchantPayout");
    address internal payer = makeAddr("payer");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant MERCHANT_ID = keccak256("org-1");
    bytes32 internal constant REF = keccak256("intent-1");

    event MerchantRegistered(bytes32 indexed merchantId, address indexed payout, uint16 feeBps);
    event MerchantUpdated(bytes32 indexed merchantId, address indexed payout, uint16 feeBps, bool active);
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

    function setUp() public {
        settlement = new AirPaySettlement(owner, treasury);
        usdc = new MockERC20();

        vm.deal(payer, 1_000 ether);
        usdc.mint(payer, 1_000_000e6);

        vm.prank(payer);
        usdc.approve(address(settlement), type(uint256).max);
    }

    // --- constructor ------------------------------------------------------

    function test_Constructor_SetsOwnerAndTreasury() public view {
        assertEq(settlement.owner(), owner);
        assertEq(settlement.treasury(), treasury);
        assertEq(settlement.DEFAULT_FEE_BPS(), 90);
    }

    function test_Constructor_RevertsOnZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new AirPaySettlement(address(0), treasury);
    }

    function test_Constructor_RevertsOnZeroTreasury() public {
        vm.expectRevert(AirPaySettlement.ZeroAddress.selector);
        new AirPaySettlement(owner, address(0));
    }

    // --- registration -----------------------------------------------------

    function test_RegisterMerchant_StoresAndEmits() public {
        vm.expectEmit(true, true, false, true, address(settlement));
        emit MerchantRegistered(MERCHANT_ID, merchantPayout, 90);

        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        (address payout, uint16 feeBps, bool active) = settlement.merchant(MERCHANT_ID);
        assertEq(payout, merchantPayout);
        assertEq(feeBps, 90);
        assertTrue(active);
        assertTrue(settlement.isRegistered(MERCHANT_ID));
    }

    function test_RegisterMerchant_RevertsWhenAlreadyRegistered() public {
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.MerchantAlreadyRegistered.selector, MERCHANT_ID));
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        vm.stopPrank();
    }

    function test_RegisterMerchant_RevertsOnZeroPayout() public {
        vm.prank(owner);
        vm.expectRevert(AirPaySettlement.ZeroAddress.selector);
        settlement.registerMerchant(MERCHANT_ID, address(0), 90);
    }

    function test_RegisterMerchant_RevertsAboveMaxFee() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.InvalidFee.selector, 1_001, 1_000));
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 1_001);
    }

    function test_RegisterMerchant_AcceptsMaxFee() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 1_000);
        (, uint16 feeBps,) = settlement.merchant(MERCHANT_ID);
        assertEq(feeBps, 1_000);
    }

    function test_RegisterMerchant_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
    }

    // --- upsert -----------------------------------------------------------

    function test_UpsertMerchant_RegistersWhenNew() public {
        vm.prank(owner);
        settlement.upsertMerchant(MERCHANT_ID, merchantPayout, 90);
        (address payout, uint16 feeBps, bool active) = settlement.merchant(MERCHANT_ID);
        assertEq(payout, merchantPayout);
        assertEq(feeBps, 90);
        assertTrue(active);
    }

    function test_UpsertMerchant_UpdatesExistingAndReactivates() public {
        address newPayout = makeAddr("newPayout");
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.setMerchantActive(MERCHANT_ID, false);
        settlement.upsertMerchant(MERCHANT_ID, newPayout, 250);
        vm.stopPrank();

        (address payout, uint16 feeBps, bool active) = settlement.merchant(MERCHANT_ID);
        assertEq(payout, newPayout);
        assertEq(feeBps, 250);
        assertTrue(active);
    }

    function test_UpsertMerchant_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        settlement.upsertMerchant(MERCHANT_ID, merchantPayout, 90);
    }

    // --- setters ----------------------------------------------------------

    function test_SetMerchantFee_Updates() public {
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.setMerchantFee(MERCHANT_ID, 300);
        vm.stopPrank();
        (, uint16 feeBps,) = settlement.merchant(MERCHANT_ID);
        assertEq(feeBps, 300);
    }

    function test_SetMerchantFee_RevertsOnUnknownMerchant() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.MerchantNotRegistered.selector, MERCHANT_ID));
        settlement.setMerchantFee(MERCHANT_ID, 100);
    }

    function test_SetMerchantPayout_Updates() public {
        address newPayout = makeAddr("newPayout");
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.setMerchantPayout(MERCHANT_ID, newPayout);
        vm.stopPrank();
        (address payout,,) = settlement.merchant(MERCHANT_ID);
        assertEq(payout, newPayout);
    }

    function test_SetMerchantActive_Toggles() public {
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.setMerchantActive(MERCHANT_ID, false);
        vm.stopPrank();
        (,, bool active) = settlement.merchant(MERCHANT_ID);
        assertFalse(active);
    }

    function test_SetTreasury_UpdatesAndRevertsZero() public {
        vm.prank(owner);
        settlement.setTreasury(stranger);
        assertEq(settlement.treasury(), stranger);

        vm.prank(owner);
        vm.expectRevert(AirPaySettlement.ZeroAddress.selector);
        settlement.setTreasury(address(0));
    }

    // --- quote / split ----------------------------------------------------

    function test_Quote_DefaultFee90Bps() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        (uint256 fee, uint256 net) = settlement.quote(MERCHANT_ID, 10_000);
        assertEq(fee, 90);
        assertEq(net, 9_910);
    }

    function test_Quote_RoundsDown() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        // 999 * 0.9% = 8.991 -> floors to 8
        (uint256 fee, uint256 net) = settlement.quote(MERCHANT_ID, 999);
        assertEq(fee, 8);
        assertEq(net, 991);
    }

    function test_Quote_RevertsOnUnknownMerchant() public {
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.MerchantNotRegistered.selector, MERCHANT_ID));
        settlement.quote(MERCHANT_ID, 10_000);
    }

    // --- payNative --------------------------------------------------------

    function test_PayNative_SplitsFeeAndNetAndEmits() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        uint256 gross = 1 ether;

        vm.expectEmit(true, true, true, true, address(settlement));
        emit Settled(MERCHANT_ID, REF, payer, address(0), gross, 0.009 ether, 0.991 ether, merchantPayout);

        vm.prank(payer);
        settlement.payNative{value: gross}(MERCHANT_ID, REF);

        assertEq(treasury.balance, 0.009 ether);
        assertEq(merchantPayout.balance, 0.991 ether);
        assertEq(address(settlement).balance, 0);
    }

    function test_PayNative_RevertsOnZeroValue() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        vm.prank(payer);
        vm.expectRevert(AirPaySettlement.NothingToSettle.selector);
        settlement.payNative{value: 0}(MERCHANT_ID, REF);
    }

    function test_PayNative_RevertsOnUnknownMerchant() public {
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.MerchantNotRegistered.selector, MERCHANT_ID));
        settlement.payNative{value: 1 ether}(MERCHANT_ID, REF);
    }

    function test_PayNative_RevertsWhenMerchantInactive() public {
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.setMerchantActive(MERCHANT_ID, false);
        vm.stopPrank();

        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(AirPaySettlement.MerchantNotActive.selector, MERCHANT_ID));
        settlement.payNative{value: 1 ether}(MERCHANT_ID, REF);
    }

    function test_PayNative_ZeroFeeSendsEverythingToPayout() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 0);

        vm.prank(payer);
        settlement.payNative{value: 1 ether}(MERCHANT_ID, REF);

        assertEq(treasury.balance, 0);
        assertEq(merchantPayout.balance, 1 ether);
    }

    function test_PayNative_BlockedWhenPaused() public {
        vm.startPrank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);
        settlement.pause();
        vm.stopPrank();

        vm.prank(payer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        settlement.payNative{value: 1 ether}(MERCHANT_ID, REF);
    }

    // --- payToken ---------------------------------------------------------

    function test_PayToken_SplitsFeeAndNetAndEmits() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        uint256 gross = 100_000e6; // 100k USDC
        uint256 fee = (gross * 90) / 10_000;

        vm.expectEmit(true, true, true, true, address(settlement));
        emit Settled(MERCHANT_ID, REF, payer, address(usdc), gross, fee, gross - fee, merchantPayout);

        vm.prank(payer);
        settlement.payToken(MERCHANT_ID, address(usdc), gross, REF);

        assertEq(usdc.balanceOf(treasury), fee);
        assertEq(usdc.balanceOf(merchantPayout), gross - fee);
        assertEq(usdc.balanceOf(address(settlement)), 0);
        assertEq(usdc.balanceOf(payer), 1_000_000e6 - gross);
    }

    function test_PayToken_RevertsWithoutApproval() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        address noApprove = makeAddr("noApprove");
        usdc.mint(noApprove, 1_000e6);

        vm.prank(noApprove);
        vm.expectRevert();
        settlement.payToken(MERCHANT_ID, address(usdc), 1_000e6, REF);
    }

    function test_PayToken_RevertsOnZeroGross() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        vm.prank(payer);
        vm.expectRevert(AirPaySettlement.NothingToSettle.selector);
        settlement.payToken(MERCHANT_ID, address(usdc), 0, REF);
    }

    function test_PayToken_RevertsOnZeroToken() public {
        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, merchantPayout, 90);

        vm.prank(payer);
        vm.expectRevert(AirPaySettlement.ZeroAddress.selector);
        settlement.payToken(MERCHANT_ID, address(0), 1e6, REF);
    }

    // --- pause / rescue ---------------------------------------------------

    function test_Pause_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        settlement.pause();
    }

    function test_Rescue_RevertsWhenNotPaused() public {
        vm.prank(owner);
        vm.expectRevert(Pausable.ExpectedPause.selector);
        settlement.rescue(address(usdc), owner, 1);
    }

    function test_Rescue_RecoversStuckTokens() public {
        usdc.mint(address(settlement), 5_000e6);

        vm.startPrank(owner);
        settlement.pause();
        settlement.rescue(address(usdc), owner, 5_000e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(owner), 5_000e6);
    }

    function test_Rescue_RecoversStuckNative() public {
        vm.deal(address(settlement), 2 ether);

        vm.startPrank(owner);
        settlement.pause();
        settlement.rescue(address(0), owner, 2 ether);
        vm.stopPrank();

        assertEq(owner.balance, 2 ether);
    }

    // --- reentrancy -------------------------------------------------------

    function test_PayNative_BlocksReentrancyViaPayout() public {
        ReentrantPayout attacker = new ReentrantPayout(settlement, MERCHANT_ID);

        vm.prank(owner);
        settlement.registerMerchant(MERCHANT_ID, address(attacker), 90);

        vm.prank(payer);
        vm.expectRevert(AirPaySettlement.NativeTransferFailed.selector);
        settlement.payNative{value: 1 ether}(MERCHANT_ID, REF);
    }
}
