import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';
import { MessageCircle, Mail, HelpCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface ContactPageProps {
  onNavigate: (page: string) => void;
}
export function ContactPage({ onNavigate }: ContactPageProps) {
  const faqs = [
    {
      q: 'Como funciona o Quelimove?',
      a: 'Baixe o app, escolha seu destino e um mototaxista próximo irá buscá-lo.'
    },
    {
      q: 'Quanto custa uma viagem?',
      a: 'O preço base é 30 MZN + valor por km. O app mostra a estimativa antes de pedir.'
    },
    {
      q: 'Como me torno mototaxista?',
      a: "Cadastre-se na opção 'Sou Mototaxista' com seus documentos e carta de condução."
    }];

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      <Header title="Suporte" onBack={() => onNavigate('home')} />

      <div className="flex-1 overflow-y-auto mt-[72px] mb-[100px] px-4 py-6 space-y-8">
        {/* Contact Cards */}
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex flex-col items-center gap-2 hover:bg-[#222222] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#FBBF24]/20 flex items-center justify-center text-[#FBBF24]">
              <MessageCircle size={20} />
            </div>
            <span className="text-sm font-medium text-white">WhatsApp</span>
          </button>
          <button className="p-4 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex flex-col items-center gap-2 hover:bg-[#222222] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
              <Mail size={20} />
            </div>
            <span className="text-sm font-medium text-white">Email</span>
          </button>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle size={20} className="text-[#9CA3AF]" />
            Perguntas Frequentes
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, i) =>
              <div
                key={i}
                className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden">

                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left">

                  <span className="text-sm font-medium text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-[#9CA3AF] transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />

                </button>
                <AnimatePresence>
                  {openFaq === i &&
                    <motion.div
                      initial={{
                        height: 0
                      }}
                      animate={{
                        height: 'auto'
                      }}
                      exit={{
                        height: 0
                      }}
                      className="overflow-hidden">

                      <p className="px-4 pb-4 text-sm text-[#9CA3AF]">
                        {faq.a}
                      </p>
                    </motion.div>
                  }
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Report Issue */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Reportar Problema</h3>
          <textarea
            className="w-full h-32 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-white p-4 placeholder:text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#FBBF24]"
            placeholder="Descreva o problema..." />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              const text = (document.querySelector('textarea') as HTMLTextAreaElement)?.value;
              if (!text?.trim()) {
                alert('Por favor, descreva o problema antes de enviar.');
                return;
              }
              alert('Obrigado! O seu reporte foi enviado para a equipa técnica do Quelimove. Iremos analisar e responder em breve.');
              (document.querySelector('textarea') as HTMLTextAreaElement).value = '';
            }}
          >
            Enviar Reporte
          </Button>
        </div>
      </div>
      <BottomNav activeTab="home" onTabChange={(tab) => onNavigate(tab)} />
    </div>);

}