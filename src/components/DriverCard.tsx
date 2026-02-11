import React from 'react';
import { Star, MessageCircle, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
interface DriverCardProps {
  name: string;
  rating: number;
  rides: number;
  vehicle: string;
  plate: string;
  price: string;
  image: string;
  onSelect?: () => void;
  selected?: boolean;
}
export function DriverCard({
  name,
  rating,
  rides,
  vehicle,
  plate,
  price,
  image,
  onSelect,
  selected
}: DriverCardProps) {
  return (
    <motion.div
      whileTap={{
        scale: 0.98
      }}
      onClick={onSelect}
      className={`p-4 rounded-2xl bg-[#1a1a1a] border transition-all cursor-pointer flex items-center gap-4
        ${selected ? 'border-[#FBBF24] ring-1 ring-[#FBBF24]' : 'border-[#2a2a2a] hover:border-[#4B5563]'}`}>

      <div className="relative">
        <img
          src={image}
          alt={name}
          className="w-14 h-14 rounded-full object-cover border-2 border-[#2a2a2a]" />

        <div className="absolute -bottom-1 -right-1 bg-[#FBBF24] text-[10px] text-black font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Star size={8} fill="currentColor" />
          {rating}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-white">{name}</h3>
          <span className="text-[#FBBF24] font-bold">{price}</span>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-0.5">
          {vehicle} • {plate}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-[#6B7280] bg-[#0a0a0a] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
            {rides} viagens
          </span>
          <div className="flex gap-2 ml-auto">
            <button className="p-1.5 rounded-full bg-[#2a2a2a] text-white hover:bg-[#374151]">
              <MessageCircle size={14} />
            </button>
            <button className="p-1.5 rounded-full bg-[#FBBF24] text-black hover:bg-[#F59E0B]">
              <Phone size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>);

}