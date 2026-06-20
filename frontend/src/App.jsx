import { Component, useEffect } from 'react';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HashLoader from "react-spinners/HashLoader";


import { lazy, Suspense } from 'react';
const Home = lazy(() => import('./pages/Home/Home'));
const Login = lazy(() => import('./pages/Login/Login'));
const Assessments = lazy(() => import('./pages/Assessments/Assessments'));
const Branch = lazy(() => import('./pages/Branch/Branch'));
const BranchAudit = lazy(() => import('./pages/Branch/BranchAudit/BranchAudit.jsx'));
const BranchAuditForm = lazy(() => import('./pages/Branch/BranchAudit/BranchAuditForm.jsx'));
const BranchAuditProfile = lazy(() => import('./pages/Branch/BranchAudit/BranchAuditProfile.jsx'));
const Employee = lazy(() => import('./pages/Employee/Employee'));
const CreateEmployee = lazy(() => import('./pages/Employee/CreateEmployee'));
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
const WalkinList = lazy(() => import('./pages/Walkin/WalkinList.jsx'))
const WalkinReport = lazy(() => import('./pages/Walkin/WalkinReport.jsx'))
const TaskManagement = lazy(() => import('./pages/Task/TaskManagement.jsx'))
const CreateTask = lazy(() => import('./pages/Task/CreateTask.jsx'))
const AutoTask = lazy(() => import('./pages/Task/AutoTask.jsx'))
const ExistingUsers = lazy(() => import('./pages/Setting/UserManagement/ExistingUsers.jsx'))
const CreateNewUser = lazy(() => import('./pages/Setting/UserManagement/CreateNewUser.jsx'))
const CreateNotificationPage = lazy(() => import('./pages/Setting/CreateNotificationPage.jsx'))

import { setUser, logout } from './features/auth/authSlice.js';

// Custom Components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Header from './components/Header/Header';
import NotificationPoller from './components/Notification/NotificationPoller';

import baseUrl from './api/api';

class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f8",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "420px",
            width: "100%",
            borderRadius: "18px",
            background: "#ffffff",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.12)",
            padding: "28px",
            textAlign: "center",
          }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 10px", color: "#0f172a" }}>
              App update needed
            </h1>
            <p style={{ margin: "0 0 22px", color: "#64748b", lineHeight: 1.5 }}>
              A new version was deployed while this page was open. Refresh to load the latest files.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: "12px",
                background: "#0f172a",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 18px",
              }}
            >
              Refresh app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Layout wrapper that adds the global header to all protected pages
const ProtectedLayout = ({ children, hideForRoles }) => {
  const user = useSelector((state) => state.auth.user);
  if (user && hideForRoles && hideForRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return (
    <ProtectedRoute>
      <Header />
      <div style={{ paddingTop: '60px' }}>{children}</div>
    </ProtectedRoute>
  );
};

const preloadProtectedRoutes = () => {
  const routes = [
    () => import('./pages/Assessments/Assessments'),
    () => import('./pages/Branch/Branch'),
    () => import('./pages/Branch/BranchAudit/BranchAudit.jsx'),
    () => import('./pages/Branch/BranchAudit/BranchAuditForm.jsx'),
    () => import('./pages/Branch/BranchAudit/BranchAuditProfile.jsx'),
    () => import('./pages/Branch/AddBranch.jsx'),
    () => import('./pages/Employee/Employee'),
    () => import('./pages/Employee/CreateEmployee'),
    () => import('./pages/Modules/Module'),
    () => import('./pages/Training/Training'),
    () => import('./pages/Setting/Setting'),
    () => import('./pages/Training/CreateTraining'),
    () => import('./pages/Training/AssignedTrainings'),
    () => import('./pages/Training/AssingOrdelete'),
    () => import('./pages/Modules/createmodule/CreateModule'),
    () => import('./pages/Training/createTraining/CreateTrainings'),
    () => import('./pages/Training/Reassign/Reassign'),
    () => import('./pages/Training/Mandatorytraining/Mandatorytraining'),
    () => import('./pages/Training/UserTrainingProgress/UserTrainingProgress'),
    () => import('./pages/Assessments/CreateAssessment/CreateAssessment'),
    () => import('./pages/Assessments/AssessmentsAssign/AssessmentsAssign'),
    () => import('./pages/Assessments/AssignAssessment/AssignAssessment'),
    () => import('./pages/Notification/Notifications.jsx'),
    () => import('./pages/OverDue/AssessmentOverDuedata.jsx'),
    () => import('./pages/OverDue/TraningOverDuedata.jsx'),
    () => import('./pages/Employee/EmployeeDetaile/EmployeeDetaile.jsx'),
    () => import('./pages/Branch/BranchDetails/BranchDetails.jsx'),
    () => import('./pages/profile/Profile.jsx'),
    () => import('./pages/Setting/LoginAnalytics.jsx'),
    () => import('./pages/Walkin/WalkinList.jsx'),
    () => import('./pages/Walkin/WalkinReport.jsx'),
    () => import('./pages/Task/TaskManagement.jsx'),
    () => import('./pages/Task/CreateTask.jsx'),
    () => import('./pages/Setting/UserManagement/ExistingUsers.jsx'),
    () => import('./pages/Setting/UserManagement/CreateNewUser.jsx'),
    () => import('./pages/Setting/CreateNotificationPage.jsx'),
  ];

  const run = () => {
    routes.forEach((load) => {
      load().catch(() => {});
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 0);
  }
};




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
          const response = await fetch(`${baseUrl.baseUrl}api/admin/admin/verifyToken`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            dispatch(logout());
            navigate('/login');
            return;
          }

          const request = await response.json();

          if (request.user) {
            dispatch(setUser({
              userId: request.user.userId,
              role: request.user.role,
              username: request.user.username,
            }));
          } else {
            console.error('No user data in token verification response');
            dispatch(logout());
            navigate('/login');
          }

        } catch (error) {
          console.error('Error verifying token:', error);
          dispatch(logout());
          navigate('/login');
        }
      };

      verifyToken();
    }

    preloadProtectedRoutes();
  }, [dispatch, navigate]);

  return (
    <>
      <AppErrorBoundary>
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
            <Route path="/" element={<ProtectedLayout><Home /></ProtectedLayout>} />
            <Route path="/assessments" element={<ProtectedLayout hideForRoles={['store_admin']}><Assessments /></ProtectedLayout>} />

            <Route path="/branch" element={<ProtectedLayout><Branch /></ProtectedLayout>} />
            <Route path="/branch/audit" element={<ProtectedLayout><BranchAudit /></ProtectedLayout>} />
            <Route path="/branch/audit/create" element={<ProtectedLayout><BranchAuditForm /></ProtectedLayout>} />
            <Route path="/branch/audit/:id" element={<ProtectedLayout><BranchAuditProfile /></ProtectedLayout>} />
            <Route path="/Addbranch" element={<ProtectedLayout><AddBranch /></ProtectedLayout>} />

            <Route path="/employee" element={<ProtectedLayout><Employee /></ProtectedLayout>} />
            <Route path="/employee/create" element={<ProtectedLayout><CreateEmployee /></ProtectedLayout>} />
            <Route path="/module" element={<ProtectedLayout><Module /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><Setting /></ProtectedLayout>} />
            <Route path="/settings/users" element={<ProtectedLayout><ExistingUsers /></ProtectedLayout>} />
            <Route path="/settings/create-user" element={<ProtectedLayout><CreateNewUser /></ProtectedLayout>} />
            <Route path="/settings/create-notification" element={<ProtectedLayout><CreateNotificationPage /></ProtectedLayout>} />
            <Route path="/alltraining" element={<ProtectedLayout hideForRoles={['store_admin']}><Training /></ProtectedLayout>} />
            <Route path="/training" element={<ProtectedLayout hideForRoles={['store_admin']}><CreateTraining /></ProtectedLayout>} />
            <Route path="/assigdata" element={<ProtectedLayout hideForRoles={['store_admin']}><AssignedTrainings /></ProtectedLayout>} />
            <Route path="/assigtraining/:id" element={<ProtectedLayout hideForRoles={['store_admin']}><AssingOrdelete /></ProtectedLayout>} />
            <Route path="/createmodule" element={<ProtectedLayout><CreateModule /></ProtectedLayout>} />
            <Route path="/createmodule/:id" element={<ProtectedLayout><CreateModule /></ProtectedLayout>} />
            <Route path="/createnewtraining" element={<ProtectedLayout hideForRoles={['store_admin']}><CreateTrainings /></ProtectedLayout>} />
            <Route path="/createnewtraining/:id" element={<ProtectedLayout hideForRoles={['store_admin']}><CreateTrainings /></ProtectedLayout>} />
            <Route path="/reassign/:id" element={<ProtectedLayout hideForRoles={['store_admin']}><Reassign /></ProtectedLayout>} />
            <Route path="/create/mandatorytraining" element={<ProtectedLayout hideForRoles={['store_admin']}><MandatoryTraining /></ProtectedLayout>} />
            <Route path="/trainingdetails/:id" element={<ProtectedLayout hideForRoles={['store_admin']}><UserTrainingProgress /></ProtectedLayout>} />
            <Route path="/create/assessment" element={<ProtectedLayout hideForRoles={['store_admin']}><CreateAssessment /></ProtectedLayout>} />
            <Route path="/assessment/assign/:id" element={<ProtectedLayout hideForRoles={['store_admin']}><AssessmentsAssign /></ProtectedLayout>} />
            <Route path="/assign/assessment" element={<ProtectedLayout hideForRoles={['store_admin']}><AssignAssessment /></ProtectedLayout>} />
            {/* Test route removed - no longer needed */}
            <Route path="/admin/Notification" element={<ProtectedLayout><Notifications /></ProtectedLayout>} />

            <Route path="/admin/overdue/assessment" element={<ProtectedLayout hideForRoles={['store_admin']}><AssessmentOverDuedata /></ProtectedLayout>} />
            <Route path="/admin/overdue/training" element={<ProtectedLayout hideForRoles={['store_admin']}><TraningOverDuedata /></ProtectedLayout>} />
            <Route path="/detailed/:id" element={<ProtectedLayout><EmployeeDetaile /></ProtectedLayout>} />

            <Route path="/branch/detailed/:id" element={<ProtectedLayout><BranchDetails /></ProtectedLayout>} />
            <Route path="/admin/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
            <Route path="/admin/login-analytics" element={<ProtectedLayout><LoginAnalytics /></ProtectedLayout>} />
            <Route path="/walkin/list" element={<ProtectedLayout><WalkinList /></ProtectedLayout>} />
            <Route path="/walkin/report" element={<ProtectedLayout><WalkinReport /></ProtectedLayout>} />
            <Route path="/task" element={<ProtectedLayout><TaskManagement /></ProtectedLayout>} />
            <Route path="/task/create" element={<ProtectedLayout><CreateTask /></ProtectedLayout>} />
            <Route path="/task/auto-schedule" element={<ProtectedLayout><AutoTask /></ProtectedLayout>} />

          </Routes>
        </Suspense>
      </AppErrorBoundary>
      <ToastContainer />
      <NotificationPoller />
    </>
  );
}

export default App;
