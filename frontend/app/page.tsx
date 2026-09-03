import HomeSwitch from "@/components/home/HomeSwitch";

export default function Home() {
  // Which page "/" is depends on the signed-in account, which is only readable
  // on the client, so the choice is made there.
  return <HomeSwitch />;
}
