// import SideNav from "../../components/SideNav/SideNav";
import EmployeeData from "./EmployeeData";
import ModileNav from "../../components/SideNav/ModileNav";


const Employee = () => {
    return (
        <>
            <div style={styles.container} className="bg-white">
                {/* <div style={styles.left} className="hidden md:block z-50">
                    <SideNav />
                </div> */}
                <div className="md:hidden">
                    <ModileNav />
                </div>

                <div style={styles.middle} className="">
                    <EmployeeData />
                </div>
            </div>
        </>
    );
}

const styles = {
    container: {
        display: "flex",
        width: "100%",
        minHeight: "100vh", // Ensure it takes the full height of the viewport
        backgroundColor: "white", // Set background color to white for the entire container
        overflowX: "hidden", // Prevent horizontal scrolling
    },
    left: {
        // Adjust size as needed for the sidebar
    },
    middle: {
        flex: 1,
        width: "100%", // Ensure it takes the full width of the remaining space
        minHeight: "100vh", // Ensure it stretches vertically
    },
};

export default Employee