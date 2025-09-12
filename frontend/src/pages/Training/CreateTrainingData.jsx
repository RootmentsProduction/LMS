import { Link } from "react-router-dom";
import RoundProgressBar from "../../components/RoundBar/RoundBar";
import Header from "../../components/Header/Header";
import { FaPlus } from "react-icons/fa";
import { CiFilter } from "react-icons/ci";
import { useEffect, useState } from "react";
import baseUrl from "../../api/api";
import Card from "../../components/Skeleton/Card";
import SideNav from "../../components/SideNav/SideNav";
import { useSelector } from "react-redux";

const CreateTrainingData = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterRange, setFilterRange] = useState("");
  const [selectedUniqueItem, setSelectedUniqueItem] = useState("");
  const [dropdownStates, setDropdownStates] = useState({ range: false, role: false });
  const user = useSelector((state) => state.auth.user);

  const [uniqueItems, setUniqueItems] = useState([]);
  const toggleDropdown = (key) => {
    setDropdownStates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${baseUrl.baseUrl}api/get/mandatory/allusertraining`);
        if (!response.ok) throw new Error("Failed to fetch data");
        const result = await response.json();
        setData(result.data);
        const items = new Set();
        result.data.forEach((training) => {
          training.uniqueItems.forEach((item) => items.add(item));
        });

        setUniqueItems([...items]);
        console.log(":hi" + uniqueItems);

        setFilteredData(result.data);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const applyFilters = (range, role) => {
    let filtered = [...data];

    if (range) {
      const [min, max] = range.split("-").map(Number);
      filtered = filtered.filter(
        (item) => item.averageCompletionPercentage >= min && item.averageCompletionPercentage <= max
      );
    }

    if (role) {
      filtered = filtered.filter((item) => item?.uniqueItems.includes(role));
    }

    setFilteredData(filtered);
  };

  const handleFilterChange = (range) => {
    setFilterRange(range);
    toggleDropdown("range");
    applyFilters(range, selectedUniqueItem);
  };

  const handleUniqueItemChange = (role) => {
    setSelectedUniqueItem(role);
    toggleDropdown("role");
    applyFilters(filterRange, role);
  };

  return (
    <div className="w-full mb-[70px] h-full bg-white">
      <Header name="Mandatory Training" />
      <SideNav />
      <div className="md:ml-[100px] mt-[100px]">
        {/* Header Section */}
        <div className="flex justify-end mr-20">
          <Link to="/Alltraining">
            <div className="flex w-56 mt-5 border-2 justify-center items-center py-2 ml-10 cursor-pointer">
              <h4 className="text-black">Show All Training</h4>
            </div>
          </Link>
        </div>

        {/* Filter Section */}
        <div className="flex text-black ml-10 gap-5 text-xl w-auto">
          <h4 className="border-b-[3px] border-[#016E5B] text-[#016E5B]">Mandatory Trainings</h4>
          <Link to="/AssigData">
            <h4 className="cursor-pointer">Assigned Trainings</h4>
          </Link>
        </div>
        <hr className="mx-10 mt-[-1px] border-[#016E5B]" />

        <div className="flex md:mx-10 md:justify-between mt-10 sm:justify-start">
          {user?.role === 'super_admin' ? <div className="flex w-56 border-2 justify-evenly items-center py-2 ml-10 cursor-pointer">
            <FaPlus className="text-[#016E5B]" />
            <Link to="/create/Mandatorytraining">
              <h4 className="text-black sm:text-sm">Create Mandatory Training</h4>
            </Link>
          </div> : null}


          {/* Dropdowns */}
          <div>
            {["range", "role"].map((key) => (
              <div className="relative hidden md:inline-block text-left w-36 mr-10" key={key}>
                <button
                  type="button"
                  className="flex justify-between items-center w-full border-2 py-2 px-4 bg-white text-black rounded-md hover:bg-gray-200 focus:outline-none"
                  onClick={() => toggleDropdown(key)}
                  aria-expanded={dropdownStates[key] ? "true" : "false"}
                  aria-controls={`${key}-dropdown`}
                >
                  <h4>
                    {key === "range"
                      ? filterRange
                        ? `${filterRange}%`
                        : "Range"
                      : selectedUniqueItem || "Role"}
                  </h4>
                  <CiFilter className="text-[#016E5B]" />
                </button>
                {dropdownStates[key] && (
                  <div
                    id={`${key}-dropdown`}
                    className="absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white z-10"
                  >
                    <div className="py-1">
                      {key === "range"
                        ? ["", "0-25", "26-51", "52-77", "78-100"].map((range, index) => (
                          <a
                            key={index}
                            href="#"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault();
                              handleFilterChange(range);
                            }}
                          >
                            {range ? `${range}%` : "All"}
                          </a>
                        ))
                        : [
                          <a
                            key="all-roles"
                            href="#"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault();
                              handleUniqueItemChange("");
                            }}
                          >
                            All
                          </a>,
                          ...uniqueItems.map((role, index) => (
                            <a
                              key={index}
                              href="#"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              onClick={(e) => {
                                e.preventDefault();
                                handleUniqueItemChange(role);
                              }}
                            >
                              {role}
                            </a>
                          )),
                        ]}
                    </div>
                  </div>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* Training Cards */}
        <div className="mt-10 ml-10 flex flex-wrap gap-3">
          {loading
            ? Array(4)
              .fill(null)
              .map((_, i) => <Card key={i} />)
            : filteredData.map((item, index) => (
              <Link key={item._id || `training-${index}`} to={`/AssigTraining/${item?.trainingId}`}>
                <RoundProgressBar
                  initialProgress={item?.averageCompletionPercentage || 0}
                  title={item?.trainingName}
                  Module={`No. of Modules: ${item?.numberOfModules || 0}`}
                  duration={`No. of users: ${item?.totalUsers || 0}`}
                  complete={`Completion Rate: ${item?.averageCompletionPercentage || 0}%`}
                />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CreateTrainingData;
