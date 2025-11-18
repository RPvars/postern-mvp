import Image from 'next/image';
import { Construction } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <Image
            src="/posterns-logo.svg"
            alt="Posterns"
            width={180}
            height={54}
            className="mx-auto"
            priority
          />
        </div>

        <div className="mb-6 flex justify-center">
          <div className="bg-slate-100 rounded-full p-6">
            <Construction className="w-12 h-12 text-slate-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Sistēma īslaicīgi nav pieejama
        </h1>

        <p className="text-slate-600 mb-6 leading-relaxed">
          Veicam tehniskos uzlabojumus. Lūdzu, mēģiniet vēlreiz pēc brīža.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-500">
          Paldies par jūsu pacietību!
        </div>
      </div>
    </div>
  );
}
