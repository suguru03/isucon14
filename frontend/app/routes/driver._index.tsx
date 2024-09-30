import { ButtonLink } from "../components/primitives/button/button";

export default function Index() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 text-center content-center bg-blue-200">Map</div>
      <div className="px-4 py-16 flex justify-center border-t">
        <ButtonLink to="#">受付開始</ButtonLink>
      </div>
    </div>
  );
}
