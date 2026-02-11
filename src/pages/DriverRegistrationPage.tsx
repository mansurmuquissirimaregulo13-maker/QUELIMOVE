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
            bi_front_url: 'simulated_bi_front.jpg',
            bi_back_url: 'simulated_bi_back.jpg',
            license_url: 'simulated_license.jpg',
            status: 'pending' // Administrador precisa aprovar
          })
          .eq('id', userId);

        if (profileError) throw profileError;
      }

      // 3. Send WhatsApp notification
      const message = `*Novo Cadastro de Motorista - Quelimove*\n\n` +
        `👤 *Nome:* ${formData.name}\n` +
        `📧 *Email:* ${formData.email}\n` +
        `📞 *WhatsApp:* ${formData.phone}\n` +
        `🪪 *BI:* ${formData.bi}\n` +
        `🏘️ *Bairro:* ${formData.bairro}\n` +
        `🏍️ *Veículo:* ${formData.vehicleModel} (${vehicleType})\n` +
        `🔢 *Matrícula:* ${formData.plate}\n\n` +
        `Por favor, valide meus documentos para começar a trabalhar.`;

      const whatsappUrl = `https://wa.me/258840000000?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, '_blank');
      alert('Cadastro realizado com sucesso! Aguarde a aprovação do administrador.');
      onNavigate('home');
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
          className={`h-2 rounded-full transition-all duration-300 ${step === i ? 'w-8 bg-[#FBBF24]' : step > i ? 'w-2 bg-[#FBBF24]' : 'w-2 bg-[#2a2a2a]'
            }`}
        />
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <Header
        title="Cadastro Mototaxista"
        onBack={step === 1 ? () => onNavigate('home') : prevStep}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {renderStepIndicator()}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 pb-24"
          >
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">Conta e Dados Pessoais</h2>
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
                <div className="grid grid-cols-2 gap-4">
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
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">Veículo</h2>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { id: 'moto', icon: Bike, label: 'Moto' },
                    { id: 'carro', icon: Car, label: 'Carro' },
                    { id: 'txopela', icon: Bike, label: 'Txopela' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setVehicleType(type.id as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${vehicleType === type.id
                        ? 'bg-[#FBBF24] border-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/20'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9CA3AF]'
                        }`}
                    >
                      <type.icon size={24} className="mb-1" />
                      <span className="text-xs font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-[#9CA3AF] ml-1">Bairro de Atuação (Quelimane)</label>
                  <select
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 text-white text-sm focus:border-[#FBBF24] outline-none appearance-none"
                    value={formData.bairro}
                    onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  >
                    <option value="">Selecionar Bairro...</option>
                    {QUELIMANE_LOCATIONS.filter(l => l.type === 'bairro').map(l => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </select>
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
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">Documentos</h2>
                <p className="text-xs text-[#9CA3AF] mb-4">Carregue fotos legíveis dos seus documentos para validação.</p>
                <div className="space-y-4">
                  {[
                    { key: 'biFront', label: 'Foto do BI (Frente)' },
                    { key: 'biBack', label: 'Foto do BI (Verso)' },
                    { key: 'license', label: 'Carta de Condução' },
                    { key: 'profile', label: 'Foto de Perfil (Selfie)', icon: Camera },
                    { key: 'vehicleDoc', label: 'Livrete do Veículo' }
                  ].map((doc) => (
                    <div key={doc.key} className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        id={`file-${doc.key}`}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, doc.key as any)}
                      />
                      <label
                        htmlFor={`file-${doc.key}`}
                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${uploads[doc.key as keyof typeof uploads]
                          ? 'bg-[#FBBF24]/10 border-[#FBBF24] text-[#FBBF24]'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9CA3AF] hover:bg-[#222222]'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {doc.icon ? <doc.icon size={20} /> : <Upload size={20} />}
                          <span className="text-sm font-medium">{doc.label}</span>
                        </div>
                        {uploads[doc.key as keyof typeof uploads] ? (
                          <div className="flex items-center gap-2">
                            <img src={uploads[doc.key as keyof typeof uploads]} alt="Preview" className="w-8 h-8 rounded object-cover border border-[#FBBF24]" />
                            <CheckCircle size={20} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-dashed border-[#4B5563]" />
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-white mb-4">Finalizar e Revisar</h2>
                <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-[#2a2a2a] space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#2a2a2a]">
                    <span className="text-xs text-[#9CA3AF] uppercase font-bold">Motorista</span>
                    <span className="text-sm text-white font-bold">{formData.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-[#2a2a2a]">
                    <span className="text-xs text-[#9CA3AF] uppercase font-bold">Veículo</span>
                    <span className="text-sm text-white font-bold">{formData.vehicleModel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#9CA3AF] uppercase font-bold">Matrícula</span>
                    <span className="text-sm text-white font-bold">{formData.plate}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#9CA3AF] mb-3">Métodos de Pagamento Aceites</h3>
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
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold uppercase text-center ${formData.paymentMethods[id as keyof typeof formData.paymentMethods]
                          ? 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#9CA3AF]'
                          }`}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-[#4B5563] text-[#FBBF24] focus:ring-[#FBBF24] bg-transparent"
                  />
                  <span className="text-[10px] text-[#9CA3AF] leading-tight group-hover:text-white transition-colors">
                    Ao confirmar, você concorda que as informações fornecidas são verdadeiras e aceita os <span className="text-[#FBBF24] font-bold">Termos de Serviço da Quelimove</span>.
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a] border-t border-[#1a1a1a]">
          {step < 4 ? (
            <Button
              onClick={nextStep}
              className="w-full h-14 text-lg"
              disabled={
                (step === 1 && (!formData.name || !formData.email || !formData.password || !formData.phone || !BI_REGEX.test(formData.bi))) ||
                (step === 3 && (!uploads.biFront || !uploads.biBack || !uploads.license || !uploads.profile || !uploads.vehicleDoc))
              }
            >
              {step === 1 && formData.bi && !BI_REGEX.test(formData.bi) ? 'BI Inválido (12 dígitos + letra)' : 'Próximo'}
              <ChevronRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-lg"
              disabled={!formData.termsAccepted || isLoading}
              isLoading={isLoading}
              onClick={handleFinish}
            >
              Concluir e Enviar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}