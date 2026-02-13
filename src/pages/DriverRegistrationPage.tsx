import * as React from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  User,
  Phone,
  Bike,
  Car,
  CheckCircle,
  Upload,
  Camera,
  Calendar,
  FileText,
  ChevronRight,
  Mail,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { QUELIMANE_LOCATIONS } from '../constants';

// Validação de BI Moçambicano: 12 dígitos + 1 letra
const BI_REGEX = /^\d{12}[A-Z]$/;

interface DriverRegistrationPageProps {
  onNavigate: (page: string) => void;
}

export function DriverRegistrationPage({
  onNavigate
}: DriverRegistrationPageProps) {
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [vehicleType, setVehicleType] = React.useState<'moto' | 'carro' | 'txopela'>('moto');
  const [isLoginMode, setIsLoginMode] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    bi: '',
    birthdate: '',
    bairro: '',
    vehicleModel: '',
    plate: '',
    vehicleColor: '',
    vehicleYear: '',
    paymentMethods: {
      cash: true,
      mpesa: false,
      emola: false
    },
    termsAccepted: false
  });

  const [uploads, setUploads] = React.useState({
    biFront: '',
    biBack: '',
    license: '',
    profile: '',
    vehicleDoc: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof uploads) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploads((prev) => ({
        ...prev,
        [key]: url
      }));
    }
  };


  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) throw error;

      if (data.session) {
        // Check if user is actually a driver
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();

        if (profile?.role === 'driver') {
          onNavigate('driver-dash');
        } else {
          alert('Esta conta não está registada como motorista.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert('Erro no login: ' + (err.message || 'Verifique suas credenciais.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (userId) {
        // [SIMULAÇÃO DE UPLOAD] - Em produção aqui usaríamos supabase.storage.from('avatars').upload()
        // No momento usamos a URL base64/blob local ou uma placeholder para o teste
        const profileImageUrl = uploads.profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=FBBF24&color=000`;

        // 2. Update the profile with driver details
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: 'driver',
            phone: formData.phone,
            bi_number: formData.bi,
            bairro: formData.bairro,
            vehicle_type: vehicleType,
            vehicle_plate: formData.plate,
            avatar_url: profileImageUrl, // Selfie salvada como Perfil
            bi_front_url: uploads.biFront || 'simulated_bi_front.jpg',
            bi_back_url: uploads.biBack || 'simulated_bi_back.jpg',
            license_url: uploads.license || 'simulated_license.jpg',
            status: 'pending' // Administrador precisa aprovar
          })
          .eq('id', userId);

        if (profileError) throw profileError;

        // 3. Update local storage so App.tsx recognizes the driver role/status
        const updatedProfile = {
          name: formData.name,
          phone: formData.phone,
          role: 'driver',
          status: 'pending',
          avatar_url: profileImageUrl
        };
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
      }

      alert('Cadastro realizado com sucesso! Seus dados (incluindo a sua foto) foram enviados para análise. Você será notificado via WhatsApp assim que aprovado.');

      // Force reload or redirect to trigger App.tsx logic
      window.location.href = '/';
    } catch (err: any) {
      console.error('Registration error:', err);
      alert('Erro ao realizar cadastro: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-[var(--primary-color)]' : step > i ? 'w-2 bg-[var(--primary-color)] opacity-50' : 'w-2 bg-[var(--border-color)]'
            }`}
        />
      ))}
    </div>
  );
  return (
    <div className="h-[100dvh] w-full bg-[var(--bg-primary)] overflow-hidden flex flex-col relative select-none">
      <Header
        title={isLoginMode ? "Login Motorista" : "Cadastro Motorista"}
        onBack={step === 1 || isLoginMode ? () => onNavigate('home') : prevStep}
      />
      <div className="flex-1 overflow-y-auto mt-[72px] px-4 py-6">
        {!isLoginMode && renderStepIndicator()}

        <AnimatePresence mode="wait">
          {isLoginMode ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Bem-vindo de volta</h2>
                <p className="text-xs text-[var(--text-secondary)]">Entre com suas credenciais para acessar o painel.</p>
              </div>

              <div className="space-y-4">
                <Input
                  icon={Mail}
                  label="Email"
                  placeholder="email@exemplo.com"
                  type="email"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  icon={Lock}
                  label="Palavra-passe"
                  placeholder="******"
                  type="password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                />

                <Button
                  className="w-full h-14 text-lg font-black uppercase tracking-tighter rounded-2xl shadow-xl shadow-[var(--primary-glow)]"
                  isLoading={isLoading}
                  onClick={handleLogin}
                >
                  Entrar
                </Button>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--border-color)]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[var(--bg-primary)] px-2 text-[var(--text-tertiary)]">Ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-bold uppercase tracking-wide border-[var(--border-color)] text-[var(--text-secondary)]"
                  onClick={() => setIsLoginMode(false)}
                >
                  Criar Nova Conta
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="space-y-6 pb-32"
            >
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Conta e Dados</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Insira seus dados pessoais para começar.</p>
                  </div>
                  <div className="space-y-4">
                    <Input
                      icon={User}
                      label="Nome Completo"
                      placeholder="Seu nome"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <Input
                      icon={Mail}
                      label="Email"
                      placeholder="email@exemplo.com"
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                      icon={Lock}
                      label="Palavra-passe"
                      placeholder="******"
                      type="password"
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Input
                      icon={Phone}
                      label="WhatsApp / Telefone"
                      placeholder="+258 84..."
                      type="tel"
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <div className="space-y-4">
                      <Input
                        icon={FileText}
                        label="Número do BI"
                        placeholder="BI..."
                        value={formData.bi}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, bi: e.target.value })}
                      />
                      <Input
                        icon={Calendar}
                        label="Nascimento"
                        type="date"
                        value={formData.birthdate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, birthdate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => setIsLoginMode(true)}
                      className="w-full text-center text-sm text-[var(--primary-color)] font-bold hover:underline"
                    >
                      Já tenho uma conta? Fazer Login
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Informação do Veículo</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Diga-nos o que você conduz.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'moto', icon: Bike, label: 'Moto' },
                      { id: 'txopela', icon: Bike, label: 'Txopela' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setVehicleType(type.id as any)}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all min-h-[100px] ${vehicleType === type.id
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-black shadow-xl shadow-[var(--primary-glow)] scale-105'
                          : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary-color)]/30'
                          }`}
                      >
                        {type.id === 'txopela' ? (
                          <img src="/txopela.png" alt="Txopela" className="w-16 h-12 object-contain mb-1 drop-shadow-sm" />
                        ) : type.id === 'moto' ? (
                          <img src="/mota.png" alt="Moto" className="w-16 h-12 object-contain mb-1 drop-shadow-sm" />
                        ) : (
                          <type.icon size={28} className="mb-2" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Bairro de Atuação</label>
                      <div className="relative">
                        <select
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 text-[var(--text-primary)] text-sm font-medium focus:border-[var(--primary-color)] outline-none appearance-none cursor-pointer"
                          value={formData.bairro}
                          onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                        >
                          <option value="">Selecionar Bairro...</option>
                          {QUELIMANE_LOCATIONS.filter(l => l.type === 'bairro').map(l => (
                            <option key={l.name} value={l.name}>{l.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-tertiary)]">
                          <ChevronRight className="rotate-90" size={16} />
                        </div>
                      </div>
                    </div>
                    <Input
                      label="Marca e Modelo"
                      placeholder="Ex: Honda Ace 125"
                      value={formData.vehicleModel}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleModel: e.target.value })}
                    />
                    <Input
                      label="Matrícula"
                      placeholder="ABC-123-MC"
                      value={formData.plate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plate: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Cor"
                        placeholder="Vermelha"
                        value={formData.vehicleColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleColor: e.target.value })}
                      />
                      <Input
                        label="Ano"
                        placeholder="2020"
                        type="number"
                        value={formData.vehicleYear}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, vehicleYear: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Documentação</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Carregue fotos legíveis para validação.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { key: 'biFront', label: 'BI (Frente)' },
                      { key: 'biBack', label: 'BI (Verso)' },
                      { key: 'license', label: 'Carta de Condução' },
                      { key: 'profile', label: 'Sua Foto (Selfie)', icon: Camera },
                      { key: 'vehicleDoc', label: 'Livrete/Viatura' }
                    ].map((doc) => (
                      <div key={doc.key} className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          id={`file-${doc.key}`}
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, doc.key as any)}
                        />
                        <label
                          htmlFor={`file-${doc.key}`}
                          className={`w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all cursor-pointer ${uploads[doc.key as keyof typeof uploads]
                            ? 'bg-[var(--primary-color)]/5 border-[var(--primary-color)] text-[var(--primary-color)] shadow-lg'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary-color)]/30'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${uploads[doc.key as keyof typeof uploads] ? 'bg-[var(--primary-color)] text-black' : 'bg-[var(--bg-primary)]'}`}>
                              {doc.icon ? <doc.icon size={22} /> : <Upload size={22} />}
                            </div>
                            <div>
                              <span className="text-sm font-black uppercase tracking-tighter block">{doc.label}</span>
                              <span className="text-[10px] opacity-60">{uploads[doc.key as keyof typeof uploads] ? 'Ficheiro selecionado' : 'Clique para carregar'}</span>
                            </div>
                          </div>
                          {uploads[doc.key as keyof typeof uploads] ? (
                            <div className="relative group/preview">
                              <img src={uploads[doc.key as keyof typeof uploads]} alt="Preview" className="w-12 h-12 rounded-xl object-cover border-2 border-[var(--primary-color)]" />
                              <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 text-white shadow-lg">
                                <CheckCircle size={12} />
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-[var(--text-tertiary)] flex items-center justify-center opacity-40">
                              <span className="text-xs">+</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Revisar e Finalizar</h2>
                    <p className="text-xs text-[var(--text-secondary)]">Confirme se tudo está correto.</p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] p-6 rounded-[32px] border border-[var(--border-color)] space-y-4 shadow-xl">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Nome Completo</p>
                      <p className="text-lg text-[var(--text-primary)] font-bold">{formData.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Veículo</p>
                        <p className="text-sm text-[var(--text-primary)] font-bold">{formData.vehicleModel}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Matrícula</p>
                        <p className="text-sm text-[var(--text-primary)] font-bold uppercase">{formData.plate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Métodos de Pagamento</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {['cash', 'mpesa', 'emola'].map((id) => (
                        <button
                          key={id}
                          onClick={() => setFormData({
                            ...formData,
                            paymentMethods: {
                              ...formData.paymentMethods,
                              [id]: !formData.paymentMethods[id as keyof typeof formData.paymentMethods]
                            }
                          })}
                          className={`py-3 rounded-2xl border-2 transition-all text-[10px] font-black uppercase text-center ${formData.paymentMethods[id as keyof typeof formData.paymentMethods]
                            ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/10 text-[var(--primary-color)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]'
                            }`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-start gap-4 p-5 rounded-[28px] bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer group active:scale-[0.98] transition-all">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                        className="peer h-6 w-6 rounded-lg border-2 border-[var(--border-color)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] bg-transparent transition-all"
                      />
                      <CheckCircle className="absolute inset-0 m-auto text-[var(--primary-color)] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" size={16} />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-medium">
                      Declaro que as informações acima são verdadeiras e aceito os <span className="text-[var(--primary-color)] font-bold">Termos e Condições</span> da Quelimove para parceiros.
                    </span>
                  </label>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoginMode && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent pointer-events-none">
            <div className="pointer-events-auto">
              {step < 4 ? (
                <Button
                  onClick={nextStep}
                  className="w-full h-16 text-lg font-black uppercase tracking-tighter rounded-2xl shadow-2xl shadow-[var(--primary-glow)]"
                  disabled={
                    (step === 1 && (!formData.name || !formData.email || !formData.password || !formData.phone || !BI_REGEX.test(formData.bi))) ||
                    (step === 3 && (!uploads.biFront || !uploads.biBack || !uploads.license || !uploads.profile || !uploads.vehicleDoc))
                  }
                >
                  {step === 1 && formData.bi && !BI_REGEX.test(formData.bi) ? 'BI Inválido (12 dígitos + Letra)' : 'Continuar'}
                  <ChevronRight className="ml-2" size={24} />
                </Button>
              ) : (
                <Button
                  className="w-full h-16 text-lg font-black uppercase tracking-tighter rounded-2xl shadow-2xl shadow-[var(--primary-glow)]"
                  disabled={!formData.termsAccepted || isLoading}
                  isLoading={isLoading}
                  onClick={handleFinish}
                >
                  Submeter Cadastro
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}