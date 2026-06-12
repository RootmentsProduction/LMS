import ModileNav from "../../../components/SideNav/ModileNav";
import AssessmentDetailsData from "../AssessmentDetails/AssessmentDetailsData";

const AssessmentsAssign = () => {
    return (
        <>
            <div style={styles.container}>
                {/* <div style={styles.left} className=" hidden lg:block z-50">
                    <SideNav name='Assessments Assign' />
                </div> */}

                <div className="md:hidden sm:block">
                    <ModileNav />
                </div>
                <div style={styles.middle} className="">
                    <AssessmentDetailsData />
                </div>



            </div>
        </>
    )
}


const styles = {
    container: {
        display: "flex",
        width: "100%",
        minHeight: "100vh",

    },
    left: {
    },
    middle: {
        flex: 1,
        width: 100
    }
};
export default AssessmentsAssign
