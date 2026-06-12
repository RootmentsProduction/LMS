// import SideNav from "../../../components/SideNav/SideNav";
import CreateModuleData from "./CreateModuleData";
import ModileNav from "../../../components/SideNav/ModileNav";

const CreateModule = () => {
    return (
        <>
            <div style={styles.container}>
                <div className="md:hidden sm:block">
                    <ModileNav />
                </div>
                <div style={styles.middle}>
                    <CreateModuleData />
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        overflowX: "hidden",
    },
    middle: {
        flex: 1,
        width: "100%",
        minHeight: "100vh",
    },
};

export default CreateModule