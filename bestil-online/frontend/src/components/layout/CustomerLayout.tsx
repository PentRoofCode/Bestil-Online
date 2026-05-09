import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
