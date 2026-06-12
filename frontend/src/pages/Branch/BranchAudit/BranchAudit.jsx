import ModileNav from "../../../components/SideNav/ModileNav";
import BranchAuditData from "./BranchAuditData";

const BranchAudit = () => {
  return (
    <div style={styles.container} className="bg-white">
      <div className="md:hidden sm:block">
        <ModileNav />
      </div>

      <div style={styles.middle}>
        <BranchAuditData />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    backgroundColor: "#f7f7fb",
    overflowX: "hidden",
  },
  middle: {
    flex: 1,
    width: "100%",
    minHeight: "100vh",
  },
};

export default BranchAudit;
