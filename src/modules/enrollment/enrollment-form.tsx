import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '../auth/auth.service';
import { db } from '../../offline/db';

type Props = {
  userType: 'trabajador' | 'prevencionista' | 'supervisor';
  onEnrollSuccess?: () => void;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  company?: string;
  companyRut?: string;
  position?: string;
  pin: string;
  confirmPin: string;
};

export function EnrollmentForm({ userType, onEnrollSuccess }: Props) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    documentNumber: '',
    company: '',
    companyRut: '',
    position: '',
    pin: '',
    confirmPin: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title =
    userType === 'trabajador'
      ? 'Registro de Trabajador'
      : userType === 'prevencionista'
        ? 'Registro de Prevencionista'
        : 'Registro de Supervisor';

  const subtitle =
    userType === 'trabajador'
      ? 'Completa tus datos para acceder a la plataforma.'
      : userType === 'prevencionista'
        ? 'Crea tu acceso para gestionar módulos y firmas.'
        : 'Registra tu acceso para supervisión y control.'

  const labelClass = 'block text-xs font-semibold text-gray-600 uppercase tracking-wider';
  const inputClass =
    'mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500';
  const sectionTitleClass = 'text-sm font-semibold text-gray-900';
  const sectionHintClass = 'mt-1 text-sm text-gray-500';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate PINs match
    if (formData.pin !== formData.confirmPin) {
      setError('Los PINs no coinciden');
      return;
    }

    // Validate PIN length and content (4 digits)
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('El PIN debe contener exactamente 4 dígitos');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if PIN is already in use
      const existingUser = await db.table('users')
        .where('pin')
        .equals(formData.pin)
        .first();

      if (existingUser) {
        setError('Este PIN ya está en uso. Por favor, elija otro.');
        return;
      }

      // Create new user
      const newUser = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        documentNumber: formData.documentNumber,
        companyName: formData.company,
        companyRut: formData.companyRut,
        position: formData.position,
        pin: formData.pin,
        role: userType as UserRole,
        creadoEn: new Date(),
      };

      await db.table('users').add(newUser);
      
      if (onEnrollSuccess) {
        onEnrollSuccess();
      } else {
        navigate('/login'); // Or any other route
      }
    } catch (err) {
      console.error('Error during enrollment:', err);
      setError('Ocurrió un error durante el registro. Por favor, intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-white px-6 py-5">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          </div>

          <div className="px-6 py-6">
            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <div>
                  <h3 className={sectionTitleClass}>Datos personales</h3>
                  <p className={sectionHintClass}>Usaremos estos datos para tu identificación y contacto.</p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="name" className={labelClass}>
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                      autoComplete="name"
                      placeholder="Ej: Juan Pérez"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="documentNumber" className={labelClass}>
                      Número de documento *
                    </label>
                    <input
                      type="text"
                      id="documentNumber"
                      name="documentNumber"
                      value={formData.documentNumber}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Ej: 12.345.678-9"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={inputClass}
                      autoComplete="tel"
                      placeholder="Ej: +56 9 1234 5678"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="email" className={labelClass}>
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClass}
                      autoComplete="email"
                      placeholder="Ej: nombre@empresa.com"
                      required
                    />
                  </div>
                </div>
              </section>

              {(userType === 'trabajador' || userType === 'supervisor') && (
                <section>
                  <div>
                    <h3 className={sectionTitleClass}>Información laboral</h3>
                    <p className={sectionHintClass}>Datos de la empresa y rol dentro de la operación.</p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label htmlFor="company" className={labelClass}>
                        Empresa *
                      </label>
                      <input
                        type="text"
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Ej: PrevInET SpA"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="companyRut" className={labelClass}>
                        RUT Empresa *
                      </label>
                      <input
                        type="text"
                        id="companyRut"
                        name="companyRut"
                        value={formData.companyRut}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Ej: 76.123.456-7"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="position" className={labelClass}>
                        Cargo *
                      </label>
                      <input
                        type="text"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Ej: Operario / Supervisor"
                        required
                      />
                    </div>
                  </div>
                </section>
              )}

              <section>
                <div>
                  <h3 className={sectionTitleClass}>Seguridad</h3>
                  <p className={sectionHintClass}>Define un PIN de 4 dígitos para iniciar sesión.</p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="pin" className={labelClass}>
                      Crear PIN *
                    </label>
                    <input
                      type="password"
                      id="pin"
                      name="pin"
                      value={formData.pin}
                      onChange={handleChange}
                      maxLength={4}
                      pattern="\d{4}"
                      inputMode="numeric"
                      className={inputClass}
                      autoComplete="new-password"
                      placeholder="••••"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">Debe contener exactamente 4 dígitos.</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPin" className={labelClass}>
                      Confirmar PIN *
                    </label>
                    <input
                      type="password"
                      id="confirmPin"
                      name="confirmPin"
                      value={formData.confirmPin}
                      onChange={handleChange}
                      maxLength={4}
                      pattern="\d{4}"
                      inputMode="numeric"
                      className={inputClass}
                      autoComplete="new-password"
                      placeholder="••••"
                      required
                    />
                  </div>
                </div>
              </section>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? 'Registrando...' : 'Registrarse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
