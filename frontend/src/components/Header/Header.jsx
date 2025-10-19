import { IoIosSearch } from "react-icons/io";
import { GoBell } from "react-icons/go";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import baseUrl from "../../api/api.js";
import { IoPersonCircleSharp } from "react-icons/io5";
import LogoutConfirmation from "../LogoutConfirmation/LogoutConfirmation";
import { logout } from "../../features/auth/authSlice";


const Header = () => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchuser, setSearchuser] = useState([]);
    const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

    const [isSearching, setIsSearching] = useState(false);
    const user = useSelector((state) => state.auth.user);
    const token = localStorage.getItem('token');

    const handleLogoutClick = () => {
        setShowLogoutConfirmation(true);
    };

    const handleLogoutConfirm = () => {
        localStorage.removeItem('token');
        dispatch(logout());
        navigate('/login');
    };

    const HandleSearch = async () => {
        try {
            const response = await fetch(`${baseUrl.baseUrl}api/admin/get/searching/userORbranch`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ search })
            });

            const result = await response.json();
            setSearchResults(result.branch || []);
            setSearchuser(result.data || [])
        } catch (error) {
            console.error("Search API error:", error);
        }
    };

    useEffect(() => {
        if (search.trim()) {
            setIsSearching(true);
            const delaySearch = setTimeout(() => {
                HandleSearch();
            }, 500);
            return () => clearTimeout(delaySearch);
        } else {
            setIsSearching(false);
            setSearchResults([]);
        }
    }, [search]);

    return (
        <div className="w-full">
            <div className="flex justify-between border[#C8C8C8] bg-white fixed top-0 w-full z-10 border-b pb-6">
                <div className="flex mt-6 lg:justify-evenly items-center ml-5 gap-2">
                    <img src="/Rootments.jpg" alt="Logo" className="rounded-full" />
                    <Link to={'/'}>
                        <div className="lg:block hidden md:block cursor-pointer">
                            <div className="text-2xl text-green-700">ROOTMENTS</div>
                            <div className="flex justify-end text-sm">ENTERPRISE</div>
                        </div>
                    </Link>
                </div>

                <div className="flex lg:gap-10 gap-3 items-center mt-4 relative">
                    <div className="form-control relative lg:w-full hidden md:block">
                        <IoIosSearch className="absolute left-3 text-2xl top-1/2 transform -translate-y-1/2 text-black" />
                        <input
                            style={{ borderRadius: '10px' }}
                            value={search}
                            type="text"
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, id or branch"
                            className="border-[#C8C8C8] border p-2 bg-white lg:w-[400px] w-[250px] pl-10"
                        />
                        {isSearching && (
                            <div className="absolute top-full text-black left-0 w-full bg-white border shadow-md rounded-md mt-1 p-2 max-h-40 overflow-y-auto">
                                <h2 className="text-[#016E5B]">USER</h2>
                                {searchuser.length > 0 ? (
                                    searchuser.map((item) => (
                                        <Link to={`/detailed/${item.empID}`} key={item.empID}>
                                            <div className="p-2 hover:bg-gray-100 cursor-pointer">
                                                {item.username}
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-2 text-gray-500">No results found</div>
                                )}

                                <h2 className="text-[#016E5B]">BRANCH</h2>
                                {searchResults.length > 0 ? (
                                    searchResults.map((item) => (
                                        <Link to={`/branch/detailed/${item.locCode}`} key={item.locCode}>
                                            <div className="p-2 hover:bg-gray-100 cursor-pointer">
                                                {item.workingBranch}
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="p-2 text-gray-500">No results found</div>
                                )}
                            </div>
                        )}

                    </div>

                    <Link to={'/admin/Notification'}>
                        <div className={`text-2xl text-[#016E5B] ${isActive('/admin/Notification') ? 'bg-[#016E5B] p-2 rounded-lg text-white' : ''}`}>
                            <GoBell />
                        </div>
                    </Link>

                    <div className="dropdown dropdown-end mr-9">
                        {/* <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar flex items-center justify-center"> */}
                        {/* <img alt="User Avatar" src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp" /> */}
                        {/* <IoPersonCircleSharp className="w-full text-6xl" /> */}
                        {/* </div> */}

                        <IoPersonCircleSharp tabIndex={0} role="button" className={`btn btn-ghost btn-circle avatar  text-[#016E5B] ${isActive('/admin/profile') ? 'border-[#016E5B]  rounded-lg text-6xl ' : ''}`} />
                        <ul tabIndex={0} className="menu menu-sm dropdown-content rounded-box mt-3 w-52 p-2 shadow z-10 text-[#016E5B] bg-white">
                            <li><Link to={'/admin/profile'}>Profile</Link></li>
                            {user?.role === 'super_admin' && <li><Link to={'/settings'}>Settings</Link></li>}
                            <li><a onClick={handleLogoutClick}>Logout</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <LogoutConfirmation
                isOpen={showLogoutConfirmation}
                onClose={() => setShowLogoutConfirmation(false)}
                onConfirm={handleLogoutConfirm}
            />
        </div>
    );
};

export default Header;
