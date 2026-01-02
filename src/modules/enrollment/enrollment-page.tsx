import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnrollmentForm } from './enrollment-form';

type UserType = 'trabajador' | 'prevencionista' | 'supervisor';

export default function EnrollmentPage() {
  const { userType } = useParams<{ userType: UserType }>();
  const navigate = useNavigate();
  const [enrollmentComplete, setEnrollmentComplete] = useState(false);

  const handleEnrollSuccess = () => {
    setEnrollmentComplete(true);
    // Redirect to login after 3 seconds
    setTimeout(() => {
      navigate('/login');
    }, 3000);
  };

  if (!userType || (userType !== 'trabajador' && userType !== 'prevencionista' && userType !== 'supervisor')) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Tipo de usuario no válido
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Por favor, selecciona un tipo de usuario válido.
          </p>
          <div className="mt-5">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (enrollmentComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
            ¡Registro exitoso!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Tu cuenta ha sido creada correctamente. Serás redirigido al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {userType === 'trabajador'
            ? 'Registro de Trabajador'
            : userType === 'prevencionista'
              ? 'Registro de Prevencionista'
              : 'Registro de Supervisor'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Completa el formulario para crear tu cuenta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <EnrollmentForm 
            userType={userType} 
            onEnrollSuccess={handleEnrollSuccess} 
          />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">¿Ya tienes una cuenta?</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
