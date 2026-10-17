import Web3Provider from "@/components/pay/Web3Provider";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}
