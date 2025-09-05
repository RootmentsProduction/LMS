import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "@fontsource/poppins"
import "@fontsource/poppins/500.css"
import "@fontsource/poppins/700.css"
import HashLoader from "react-spinners/HashLoader";


import { lazy, Suspense } from 'react';
const Home = lazy(() => import('./pages/Home/Home'));
const Login = lazy(() => import('./pages/Login/Login'));
const Assessments = lazy(() => import('./pages/Assessments/Assessments'));
const Branch = lazy(() => import('./pages/Branch/Branch'));
const Employee = lazy(() => import('./pages/Employee/Employee'));
const Module = lazy(() => import('./pages/Modules/Module'));
const Training = lazy(() => import('./pages/Training/Training'));
const Setting = lazy(() => import('./pages/Setting/Setting'));
const CreateTraining = lazy(() => import('./pages/Training/CreateTraining'));
const AssignedTrainings = lazy(() => import('./pages/Training/AssignedTrainings'));
const AssingOrdelete = lazy(() => import('./pages/Training/AssingOrdelete'));
const CreateModule = lazy(() => import('./pages/Modules/createmodule/CreateModule'));
const CreateTrainings = lazy(() => import('./pages/Training/createTraining/CreateTrainings'));
const Reassign = lazy(() => import('./pages/Training/Reassign/Reassign'));
const MandatoryTraining = lazy(() => import('./pages/Training/Mandatorytraining/Mandatorytraining'));
const UserTrainingProgress = lazy(() => import('./pages/Training/UserTrainingProgress/UserTrainingProgress'));
const CreateAssessment = lazy(() => import('./pages/Assessments/CreateAssessment/CreateAssessment'));
const AssessmentsAssign = lazy(() => import('./pages/Assessments/AssessmentsAssign/AssessmentsAssign'));
const AssignAssessment = lazy(() => import('./pages/Assessments/AssignAssessment/AssignAssessment'));
// Test component removed - no longer needed
const Notifications = lazy(() => import('./pages/Notification/Notifications.jsx'))
const AddBranch = lazy(() => import('./pages/Branch/AddBranch.jsx'))
const AssessmentOverDuedata = lazy(() => import('./pages/OverDue/AssessmentOverDuedata.jsx'))
const TraningOverDuedata = lazy(() => import('./pages/OverDue/TraningOverDuedata.jsx'))
const EmployeeDetaile = lazy(() => import('./pages/Employee/EmployeeDetaile/EmployeeDetaile.jsx'))
const BranchDetails = lazy(() => import('./pages/Branch/BranchDetails/BranchDetails.jsx'))
const Profile = lazy(() => import('./pages/profile/Profile.jsx'))
const LoginAnalytics = lazy(() => import('./pages/Setting/LoginAnalytics.jsx'))
// APITest component removed - no longer needed

import { setUser } from './features/auth/authSlice.js';

// Custom Components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import baseUrl from './api/api';
import { useDispatch } from 'react-redux';




function App() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      const verifyToken = async () => {
        try {
          console.log('Verifying token:', token ? 'Token exists' : 'No token');
          
          const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/verifyToken`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          console.log('Token verification response status:', response.status);
          
          if (!response.ok) {
            console.error('Token verification failed:', response.status);
            navigate('/login');
            return;
          }

          const request = await response.json()
          console.log('Token verification response:', request);

          if (request.user) {
            dispatch(setUser({
              userId: request.user.userId,
              role: request.user.role,
            }));
          } else {
            console.error('No user data in token verification response');
            localStorage.removeItem('token');
            navigate('/login');
          }

        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('token');
          window.location.reload();
          navigate('/login');
        }
      };

      verifyToken();
    }
  }, [dispatch, navigate]);

  return (
    <>
      <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <HashLoader color="#016E5B" size={50} />
      </div>}>
        <Routes>
          {/* Public Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/assessments" element={<ProtectedRoute><Assessments /></ProtectedRoute>} />

          <Route path="/branch" element={<ProtectedRoute><Branch /></ProtectedRoute>} />
          <Route path="/Addbranch" element={<ProtectedRoute><AddBranch /></ProtectedRoute>} />

          <Route path="/employee" element={<ProtectedRoute><Employee /></ProtectedRoute>} />
          <Route path="/module" element={<ProtectedRoute><Module /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Setting /></ProtectedRoute>} />
          <Route path="/alltraining" element={<ProtectedRoute><Training /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><CreateTraining /></ProtectedRoute>} />
          <Route path="/assigdata" element={<ProtectedRoute><AssignedTrainings /></ProtectedRoute>} />
          <Route path="/assigtraining/:id" element={<ProtectedRoute><AssingOrdelete /></ProtectedRoute>} />
          <Route path="/createmodule" element={<ProtectedRoute><CreateModule /></ProtectedRoute>} />
          <Route path="/createnewtraining" element={<ProtectedRoute><CreateTrainings /></ProtectedRoute>} />
          <Route path="/reassign/:id" element={<ProtectedRoute><Reassign /></ProtectedRoute>} />
          <Route path="/create/mandatorytraining" element={<ProtectedRoute><MandatoryTraining /></ProtectedRoute>} />
          <Route path="/trainingdetails/:id" element={<ProtectedRoute><UserTrainingProgress /></ProtectedRoute>} />
          <Route path="/create/assessment" element={<ProtectedRoute><CreateAssessment /></ProtectedRoute>} />
          <Route path="/assessment/assign/:id" element={<ProtectedRoute><AssessmentsAssign /></ProtectedRoute>} />
          <Route path="/assign/assessment" element={<ProtectedRoute><AssignAssessment /></ProtectedRoute>} />
          {/* Test route removed - no longer needed */}
          <Route path="/admin/Notification" element={<ProtectedRoute>< Notifications /></ProtectedRoute>} />

          <Route path="/admin/overdue/assessment" element={<ProtectedRoute>< AssessmentOverDuedata /></ProtectedRoute>} />
          <Route path="/admin/overdue/training" element={<ProtectedRoute>< TraningOverDuedata /></ProtectedRoute>} />
          <Route path="/detailed/:id" element={<ProtectedRoute>< EmployeeDetaile /></ProtectedRoute>} />

          <Route path="/branch/detailed/:id" element={<ProtectedRoute>< BranchDetails /></ProtectedRoute>} />
          <Route path="/admin/profile" element={<ProtectedRoute>< Profile /></ProtectedRoute>} />
          <Route path="/admin/login-analytics" element={<ProtectedRoute>< LoginAnalytics /></ProtectedRoute>} />
          {/* APITest route removed - no longer needed */}

        </Routes>
      </Suspense>
      <ToastContainer />
    </>
  );
}

export default App;
