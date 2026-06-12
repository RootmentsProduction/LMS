import { useEffect, useMemo, useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { FaTrashAlt } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import RoundModule from "../../components/RoundBar/RoundModule";
import SideNav from "../../components/SideNav/SideNav";
import baseUrl from "../../api/api";

const AssingOrdeletedata = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [training, setTraining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTrainingDetails = async () => {
            try {
                setLoading(true);
                setError("");
                const response = await fetch(`${baseUrl.baseUrl}api/trainings/${id}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch training details");
                }
                const result = await response.json();
                setTraining(result);
            } catch (err) {
                setError(err?.message || "Failed to load training");
            } finally {
                setLoading(false);
            }
        };

        fetchTrainingDetails();
    }, [id]);

    const trainingData = training?.data;
    const users = training?.users || [];
    const modules = trainingData?.modules || [];
    const averageModules = trainingData?.averageCompletedModule || [];

    const stats = useMemo(() => {
        return [
            {
                label: "Modules",
                value: trainingData?.numberOfModules ?? 0,
                note: "Assigned in this training",
            },
            {
                label: "Users",
                value: users.length,
                note: "Employees assigned",
            },
            {
                label: "Type",
                value: trainingData?.Trainingtype || "-",
                note: "Training category",
            },
            {
                label: "Deadline",
                value: trainingData?.deadline ?? "-",
                note: "Days remaining",
            },
        ];
    }, [trainingData, users.length]);

    const HandleDelete = async () => {
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/user/delete/training/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete training");
            }

            navigate("/training");
        } catch (err) {
            toast.error(err?.message || "Failed to delete training");
        }
    };

    const handleReassign = () => {
        toast.warning("Reassign only on a computer or a larger screen like a tablet or laptop.");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <SideNav />
                <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-20">
                        <p className="text-sm text-slate-500">Loading training details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white">
                <SideNav />
                <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-8">
                    <div className="rounded-lg border border-red-200 bg-white p-4">
                        <p className="text-sm font-medium text-red-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <SideNav />

            <div className="md:ml-[120px] px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
                <Link
                    to="/training"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
                >
                    <IoIosArrowBack className="text-base" />
                    Back
                </Link>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-4xl">
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                                {trainingData?.trainingName || "Training"}
                            </h1>

                            <p className="mt-2 text-sm text-slate-600">
                                {trainingData?.Trainingtype || "Assigned"} training
                            </p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                    {users.length} users
                                </span>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                    {trainingData?.numberOfModules ?? 0} modules
                                </span>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                    Due {trainingData?.deadline ?? "-"}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                    Created {trainingData?.createdDate ? new Date(trainingData.createdDate).toLocaleDateString() : "-"}
                                </span>
                            </div>

                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="rounded-xl bg-slate-50 px-4 py-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {stat.label}
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-slate-950">
                                            {stat.value}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">{stat.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:min-w-[280px] lg:pt-1">
                            <Link
                                to={`/Trainingdetails/${id}`}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                            >
                                View More Details
                            </Link>

                            <Link
                                to={`/Reassign/${id}`}
                                className="hidden md:inline-flex w-full items-center justify-center rounded-xl bg-[#0b1526] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#111c33]"
                            >
                                Reassign Training
                            </Link>

                            <button
                                type="button"
                                onClick={handleReassign}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-[#0b1526] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#111c33] md:hidden"
                            >
                                Reassign Training
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-950">Modules</h2>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                    {modules.length > 0 ? (
                        modules.map((item) => {
                            const matchedModule = averageModules.find((mod) => mod.moduleId === item._id);

                            return (
                                <RoundModule
                                    key={item?._id}
                                    title={item?.moduleName}
                                    initialProgress={matchedModule?.completionPercentage || "0.00"}
                                    Module={`No. of videos: ${item?.videos?.length || 0}`}
                                    complete="Created by HR"
                                />
                            );
                        })
                    ) : (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500">
                            No modules found for this training.
                        </div>
                    )}
                </div>

                <div className="mt-10 flex justify-start">
                    <button
                        type="button"
                        onClick={() => document.getElementById("my_modal_1")?.showModal()}
                        className="inline-flex items-center gap-2 rounded-full px-0 py-2 text-sm font-medium text-red-600 transition hover:text-red-700"
                    >
                        <FaTrashAlt />
                        Delete Training
                    </button>
                </div>

                <dialog id="my_modal_1" className="modal">
                    <div className="modal-box bg-white text-slate-950">
                        <h3 className="text-lg font-semibold">Delete Training</h3>
                        <p className="py-4 text-sm text-slate-600">
                            Do you want to delete{" "}
                            <span className="font-semibold text-red-600">
                                {trainingData?.trainingName || "this training"}
                            </span>
                            ?
                        </p>

                        <div className="modal-action">
                            <form method="dialog" className="flex flex-wrap gap-3">
                                <button type="button" onClick={HandleDelete} className="btn btn-error text-white">
                                    Delete
                                </button>
                                <button className="btn btn-ghost">Close</button>
                            </form>
                        </div>
                    </div>
                </dialog>
            </div>
        </div>
    );
};

export default AssingOrdeletedata;
