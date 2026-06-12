import ModileNav from "../../components/SideNav/ModileNav";
import ModuleData from "./ModuleData";

const Module = () => {
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", overflowX: "hidden" }}>
      <div className="md:hidden sm:block">
        <ModileNav />
      </div>
      <div style={{ flex: 1, width: "100%", minHeight: "100vh" }}>
        <ModuleData />
      </div>
    </div>
  );
};

export default Module;
