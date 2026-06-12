import ModileNav from "../../components/SideNav/ModileNav";
import HomeData from "./HomeData";

const Home = () => {
    return (
        <>
            <div style={styles.container} className="bg-white">
                <div className="md:hidden">
                    <ModileNav />
                </div>
                <div style={styles.middle}>
                    <HomeData />
                </div>
            </div>
        </>
    );
};

const styles = {
    container: {
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "white",
        overflowX: "hidden",
    },
    middle: {
        flex: 1,
        width: "100%",
        minHeight: "100vh",
    },
};

export default Home;
