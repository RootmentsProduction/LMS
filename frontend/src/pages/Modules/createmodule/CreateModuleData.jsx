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

    // Remove Question
    const removeQuestion = (qIndex) => {
        if (currentVideo.questions.length <= 1) {
            toast.warning("At least one question is required for each video.");
            return;
        }
        
        const updatedQuestions = currentVideo.questions.filter((_, index) => index !== qIndex);
        setCurrentVideo({ ...currentVideo, questions: updatedQuestions });
        toast.success("Question removed successfully!");
    };

    // Validate if current video has at least one complete question
    const validateVideoQuestions = () => {
        if (!currentVideo.questions || currentVideo.questions.length === 0) {
            return false;
        }

        // Check if at least one question is complete
        const hasCompleteQuestion = currentVideo.questions.some(question => {
            return question.questionText && 
                   question.questionText.trim() !== "" &&
                   question.options && 
                   question.options.length >= 2 &&
                   question.options.some(option => option.trim() !== "") &&
                   question.correctAnswer && 
                   question.correctAnswer.trim() !== "";
        });

        return hasCompleteQuestion;
    };

    // Check if current video is ready to be saved
    const isCurrentVideoReady = () => {
        return currentVideo.title && 
               currentVideo.title.trim() !== "" &&
               currentVideo.videoUri && 
               currentVideo.videoUri.trim() !== "" &&
               validateVideoQuestions();
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

        // Validate that at least one question is complete
        if (!validateVideoQuestions()) {
            toast.error("⚠️ Please add at least one complete question to submit the video. Each question must have a question text, at least 2 options, and a correct answer selected.");
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

    // Clear all form data
    const clearForm = () => {
        setModuleTitle("");
        setModuleDescription("");
        setVideos(null);
        setCurrentVideo({
            title: "",
            videoUri: "",
            questions: [{ questionText: "", options: ["", "", "", ""], correctAnswer: "" }],
        });
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

        // Validate each video has required fields and complete questions
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
            
            // Validate that each video has at least one complete question
            if (!video.questions || video.questions.length === 0) {
                toast.error(`⚠️ Video "${video.title}" has no questions. Please add at least one complete question to submit the module.`);
                return;
            }
            
            const hasCompleteQuestion = video.questions.some(question => {
                return question.questionText && 
                       question.questionText.trim() !== "" &&
                       question.options && 
                       question.options.length >= 2 &&
                       question.options.some(option => option.trim() !== "") &&
                       question.correctAnswer && 
                       question.correctAnswer.trim() !== "";
            });
            
            if (!hasCompleteQuestion) {
                toast.error(`⚠️ Video "${video.title}" has incomplete questions. Please ensure each video has at least one complete question with question text, options, and correct answer selected.`);
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
            
            // Clear the form after successful submission
            clearForm();
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

                        {currentVideo.questions.map((q, qIndex) => {
                            const isQuestionComplete = q.questionText && 
                                                      q.questionText.trim() !== "" &&
                                                      q.options && 
                                                      q.options.length >= 2 &&
                                                      q.options.some(option => option.trim() !== "") &&
                                                      q.correctAnswer && 
                                                      q.correctAnswer.trim() !== "";
                            
                            return (
                                <div key={qIndex} className={`space-y-4 p-4 border rounded-lg ${isQuestionComplete ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder={`Question ${qIndex + 1}`}
                                            value={q.questionText}
                                            onChange={(e) => handleQuestionChange(qIndex, "questionText", e.target.value)}
                                            className="w-full p-2 border rounded-lg bg-white"
                                        />
                                        {isQuestionComplete ? (
                                            <span className="text-green-600 text-lg" title="Question is complete">✅</span>
                                        ) : (
                                            <span className="text-orange-600 text-lg" title="Question is incomplete">⚠️</span>
                                        )}
                                        {currentVideo.questions.length > 1 && (
                                            <button
                                                onClick={() => removeQuestion(qIndex)}
                                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                                                title="Remove this question"
                                            >
                                                🗑️ Remove
                                            </button>
                                        )}
                                    </div>

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
                                
                                {/* Add Question Button */}
                                <div className="flex justify-center pt-2">
                                    <button 
                                        onClick={addQuestion} 
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                    >
                                        ➕ Add Question
                                    </button>
                                </div>
                                
                                {/* Question Count Info */}
                                <div className="text-center text-sm text-gray-600 mt-2">
                                    {currentVideo.questions.length} question{currentVideo.questions.length !== 1 ? 's' : ''} added
                                </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Validation Status Indicator */}
                <div className="float-right mt-2 mb-2">
                    {isCurrentVideoReady() ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="text-lg">✅</span>
                            <span className="text-sm font-medium">Video ready to save</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-orange-600">
                            <span className="text-lg">⚠️</span>
                            <span className="text-sm font-medium">Complete video details and add at least one question</span>
                        </div>
                    )}
                </div>

                <button 
                    onClick={saveCurrentVideo} 
                    className={`p-3 w-56 rounded-lg float-right mt-5 mb-32 ${
                        isCurrentVideoReady() 
                            ? 'bg-[#016E5B] text-white hover:bg-[#014d42]' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!isCurrentVideoReady()}
                >
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
