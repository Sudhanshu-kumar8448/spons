import {LockKeyhole,ChevronRight,MapPin,Users,} from 'lucide-react';


const handleRegister = ()=>{
  window.location.href = '/register';
}

const EventCard = ({ title, location, date, footfall, tags, isLocked }: { title: string; location: string; date?: string; footfall: string; tags: string[]; isLocked: boolean }) => (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden group hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500">
      <div className="relative h-48 bg-slate-200">
        {isLocked && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-10 flex items-center justify-center p-6 text-center">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
              <LockKeyhole className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">Login to Unlock Deck</span>
            </div>
          </div>
        )}
        <div className="absolute top-4 left-4 z-20 flex gap-2 flex-wrap">
          {tags.map((t, i) => (
            <span key={i} className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold text-indigo-600">{t}</span>
          ))}
        </div>
      </div>
      <div className="p-6">
        <h4 className="text-lg font-bold text-slate-900 mb-2">{title}</h4>
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-6 font-medium flex-wrap">
          <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {location}</div>
          <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {footfall}</div>
        </div>
        <button
          onClick={() => handleRegister()}
          className="w-full py-4 bg-slate-50 text-slate-900 group-hover:bg-indigo-600 group-hover:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          Express Interest via Concierge <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  export default EventCard;