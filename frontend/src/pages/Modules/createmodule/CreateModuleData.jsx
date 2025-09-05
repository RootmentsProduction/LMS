import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../../components/Header/Header";
import { IoIosArrowBack } from "react-icons/io";
import baseUrl from "../../../api/api";
import { toast } from "react-toastify";
import SideNav from "../../../components/SideNav/SideNav";

const CreateModuleData = () => {
    const [moduleTitle, setModuleTitle] = useState("");
    const [moduleDescription, setModuleDescription] = useState("");
    const [videos, setVideos] = useState(null);
    const [currentVideo, setCurrentVideo] = useState({
        title: "",
        videoUri: "",
        questions: [{ questionText: "", options: ["", "", "", ""], correctAnswer: "" }],
    });

    // Handle Video Input Changes
    const handleVideoChange = (field, value) => {
        setCurrentVideo({ ...currentVideo, [field]: value });
    };

    // Handle Question Input Changes
    const handleQuestionChange = (qIndex, field, value) => {
        const updatedQuestions = [...currentVideo.questions];
        updatedQuestions[qIndex][field] = value;
        setCurrentVideo({ ...currentVideo, questions: updatedQuestions });
    };

    // Handle Options
    const handleOptionChange = (qIndex, oIndex, value) => {
        const updatedQuestions = [...currentVideo.questions];
        updatedQuestions[qIndex].options[oIndex] = value;
        setCurrentVideo({ ...currentVideo, questions: updatedQuestions });
    };

    // Handle Correct Answer Selection
    const handleCorrectAnswerChange = (qIndex, oIndex) => {
        const updatedQuestions = [...currentVideo.questions];
        updatedQuestions[qIndex].correctAnswer = updatedQuestions[qIndex].options[oIndex];
        setCurrentVideo({ ...currentVideo, questions: updatedQuestions });
    };

    // Add New Question
    const addQuestion = () => {
        const updatedQuestions = [...currentVideo.questions, { questionText: "", options: ["", "", "", ""], correctAnswer: "" }];
        setCurrentVideo({ ...currentVideo, questions: updatedQuestions });
    };

    // Save Video and Questions
    const saveCurrentVideo = () => {
        // Validate current video before saving
        if (!currentVideo.title || !currentVideo.title.trim()) {
            toast.error("Please enter a video title.");
            return;
        }
        if (!currentVideo.videoUri || !currentVideo.videoUri.trim()) {
            toast.error("Please enter a video URL.");
            return;
        }

        const updatedVideos = videos ? [...videos] : [];
        updatedVideos.push({
            ...currentVideo,
            title: currentVideo.title.trim(),
            videoUri: currentVideo.videoUri.trim(),
            questions: currentVideo.questions || []
        });
        setVideos(updatedVideos);

        // Reset current video form
        setCurrentVideo({
            title: "",
            videoUri: "",
            questions: [{ questionText: "", options: ["", "", "", ""], correctAnswer: "" }],
        });

        toast.success("Video saved successfully!");
    };

    // Submit Module
    const handleSaveModule = async () => {
        if (!videos || videos.length === 0) {
            toast.warning("Please add at least one video.");
            return;
        }

        // Validate module title and description
        if (!moduleTitle.trim()) {
            toast.error("Please enter a module title.");
            return;
        }

        if (!moduleDescription.trim()) {
            toast.error("Please enter a module description.");
            return;
        }

        // Validate each video has required fields
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            if (!video.title || !video.title.trim()) {
                toast.error(`Video ${i + 1} is missing a title.`);
                return;
            }
            if (!video.videoUri || !video.videoUri.trim()) {
                toast.error(`Video ${i + 1} is missing a video URL.`);
                return;
            }
        }

        const newModule = {
            moduleName: moduleTitle.trim(),
            description: moduleDescription.trim(),
            videos: videos.map(video => ({
                ...video,
                title: video.title.trim(),
                videoUri: video.videoUri.trim(),
                questions: video.questions || []
            }))
        };
        console.log('Submitting module:', newModule);

        try {
            const response = await fetch(`${baseUrl.baseUrl}api/modules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(newModule),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error:', response.status, errorText);
                toast.error(`Failed to create module: ${response.status} ${response.statusText}`);
                return;
            }

            const data = await response.json();
            toast.success(data.message);
        } catch (error) {
            console.error('Network error:', error);
            toast.error(`Network error: ${error.message}`);
        }
    };

    return (
        <div className="w-full h-full bg-white text-black">
            <div><Header name='Modules' /></div>
            <SideNav />
            <div className=" md:ml-[100px] mt-[100px] mx-auto max-w-[1400px] w-full mb-[70px]">




                <div>
                    <Link to={""}>
                        <div className="flex items-center gap-1 m-5 text-black cursor-pointer">
                            <IoIosArrowBack />
                            <p>Back</p>
                        </div>
                    </Link>
                </div>
                <div className="mx-10 w-auto flex justify-between space-x-10">
                    <div className="flex flex-col space-y-6">
                        <div>
                            <p className="text-[#016E5B] font-semibold mb-2">Module Title</p>
                            <input
                                placeholder="Enter module title"
                                type="text"
                                className="bg-white w-[450px] border p-2 rounded-lg"
                                value={moduleTitle}
                                onChange={(e) => setModuleTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <p className="text-[#016E5B] font-semibold mb-2">Description</p>
                            <textarea
                                placeholder="Add a description..."
                                className="w-[450px] h-[250px] border bg-white  p-4 rounded-lg"
                                value={moduleDescription}
                                onChange={(e) => setModuleDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-6">
                        <div>
                            <p className="text-[#016E5B] font-semibold mb-2">Video Title</p>
                            <input
                                type="text"
                                placeholder="Video Title"
                                value={currentVideo.title}
                                onChange={(e) => handleVideoChange("title", e.target.value)}
                                className="bg-white w-[450px] border p-2 rounded-lg"
                            />
                        </div>

                        <div>
                            <p className="text-[#016E5B] font-semibold mb-2">Video URL</p>
                            <input
                                type="text"
                                placeholder="Video URL"
                                value={currentVideo.videoUri}
                                onChange={(e) => handleVideoChange("videoUri", e.target.value)}
                                className="bg-white w-[450px] border p-2 rounded-lg"
                            />
                        </div>

                        {currentVideo.questions.map((q, qIndex) => (
                            <div key={qIndex} className="space-y-4 p-4 border rounded-lg">
                                <input
                                    type="text"
                                    placeholder={`Question ${qIndex + 1}`}
                                    value={q.questionText}
                                    onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-white "
                                />

                                {q.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center space-x-3">
                                        <input
                                            type="text"
                                            placeholder={`Option ${oIndex + 1}`}
                                            value={option}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                            className="w-full p-2 border bg-white  rounded-lg"
                                        />
                                        <input
                                            type="radio"
                                            name={`correctOption-${qIndex}`}
                                            checked={q.correctAnswer === option}
                                            onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                            className="w-5 h-5 "
                                        />
                                    </div>
                                ))}
                                <button onClick={addQuestion} className="p-2 bg-blue-500 text-white rounded-lg">
                                    Add Question
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={saveCurrentVideo} className="p-3 w-56 bg-[#016E5B] text-white rounded-lg float-right mt-5 mb-32">
                    Save video and questions
                </button>

                {/* Show saved videos count */}
                {videos && videos.length > 0 && (
                    <div className="text-center mt-4 mb-4">
                        <p className="text-green-600 font-semibold">
                            ✅ {videos.length} video{videos.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                )}

                <div className="flex justify-center">
                    <button 
                        onClick={handleSaveModule} 
                        className={`p-3 w-56 rounded-lg ${
                            videos && videos.length > 0 
                                ? 'bg-[#016E5B] text-white' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!videos || videos.length === 0}
                    >
                        Submit Module
                    </button>
                </div>
            </div>

        </div>
    );
};

export default CreateModuleData;
