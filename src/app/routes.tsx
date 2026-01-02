import { lazy } from 'react';

// Lazy load the enrollment page
const EnrollmentPage = lazy(() => import('../modules/enrollment/enrollment-page'));

// Define route configurations
export const routes = [
  {
    path: '/enroll/:userType',
    element: <EnrollmentPage />,
    public: true,
  },
  // Add other routes as needed
];

// Helper function to generate enrollment URLs
export const getEnrollmentUrl = (userType: 'trabajador' | 'prevencionista' | 'supervisor') => {
  return `/enroll/${userType}`;
};