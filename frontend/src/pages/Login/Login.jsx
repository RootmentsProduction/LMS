import { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [EmpId, setEmpId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, EmpId });
  };

  return (
    <div className="flex h-screen">
      {/* Left Side - Form */}
      <div className="md:w-1/2 w-full flex justify-center items-center bg-gray-100 flex-col ">
        <p className='text-2xl mb-10 md:w-[400px] text-black font-semibold'>Empowering Employee <span className='text-[#016E5B]'>Training</span> and Growth</p>
        <form
          onSubmit={handleSubmit}
          className="p-8 bg-white shadow-lg border-gray-500  rounded-lg w-full md:mx-0 mx-2 md:w-[400px] md:h-[400px]"
        >
          <h2 className="text-2xl font-semibold text-center mb-6 text-[#016E5B]">Login</h2>

          <label className="input  input-bordered flex items-center gap-2 mb-4 border-gray-300 bg-white">
            <input
              type="text"
              className="grow text-[#016E5B] font-semibold"
              placeholder="Employee ID "
              value={EmpId}
              onChange={(e) => setEmpId(e.target.value)}
              required
            />
          </label>

          {/* Email Field */}
          <label className="input  input-bordered flex items-center border-gray-300 gap-2 mb-4 bg-white">
            <input
              type="email"
              className="grow text-[#016E5B] font-semibold"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {/* Username Field */}


          {/* Submit Button */}
          <div className='flex justify-center items-center'>
            <button
              type="submit"
              className="w-[50%] bg-[#016E5B] text-white py-2 rounded-lg hover:bg-[#014f42] mt-[50px]"
            >
              Login
            </button>
          </div>
        </form>
      </div>

      {/* Right Side - Background */}
      <div className="w-1/2 bg-[#016E5B] md:flex justify-center items-center  hidden">
        <img src="./image.png" width={'500px'} alt="" /></div>
    </div>
  );
};

export default Login;
