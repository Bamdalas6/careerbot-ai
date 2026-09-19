'use client';

import React, { useState } from 'react';
import { X, Send, Mail, CheckCircle2, DollarSign, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import confetti from 'canvas-confetti';

interface JobRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactEmail?: string;
}

export const JobRequestModal: React.FC<JobRequestModalProps> = ({
  isOpen,
  onClose,
  contactEmail = 'bamdalas6@gmail.com',
}) => {
  const { user } = useAuth();

  const [roleTitle, setRoleTitle] = useState('');
  const [category, setCategory] = useState('Design & Creative');
  const [workType, setWorkType] = useState('Remote (Worldwide)');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) return;

    setIsSubmitting(true);

    const subject = encodeURIComponent(`[Job Request] ${roleTitle} (${workType})`);
    const body = encodeURIComponent(
      `Hello CareerBot Contact Team,\n\n` +
      `I would like to submit a job request with the following details:\n\n` +
      `• Target Role: ${roleTitle}\n` +
      `• Category: ${category}\n` +
      `• Work Mode: ${workType}\n` +
      `• Salary/Budget: ${salaryExpectation || 'Competitive'}\n` +
      `• Candidate/Requester Name: ${name || user?.name || 'Anonymous'}\n` +
      `• Reply Email: ${email || user?.email || 'Not provided'}\n` +
      `• Phone/WhatsApp: ${phone || 'Not provided'}\n\n` +
      `Additional Notes / Requirements:\n${notes || 'None specified'}\n\n` +
      `Submitted via CareerBot AI Job Request Portal.`
    );

    // Trigger local celebratory confetti
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0080ff', '#10b981', '#6366f1', '#f59e0b'],
    });

    setIsSubmitted(true);
    setIsSubmitting(false);

    // Direct mailto launch to attach to user's email client
    const mailtoUrl = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setRoleTitle('');
    setSalaryExpectation('');
    setNotes('');
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/70 to-sky-50/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0080ff] text-white shadow-xs">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Submit Job Request
              </h3>
              <p className="text-xs text-slate-500">
                Connected to contact: <span className="font-semibold text-blue-600">{contactEmail}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-black text-slate-900">
              Job Request Dispatched!
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your request for <span className="font-bold text-slate-900">"{roleTitle}"</span> has been prepared and routed to our team at <span className="font-bold text-blue-600">{contactEmail}</span>.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition"
              >
                Done
              </button>
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(`[Job Request] ${roleTitle}`)}`}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Email</span>
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Field 1: Desired Role Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                What role are you looking for? *
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior UI/UX Designer, Virtual Assistant, React Developer"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Field 2 & 3: Category & Work Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Design & Creative">Design & Creative</option>
                  <option value="Software & Engineering">Software & Engineering</option>
                  <option value="Virtual Assistance">Virtual Assistance</option>
                  <option value="Administrative & Office">Administrative & Office</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Marketing & Content">Marketing & Content</option>
                  <option value="Customer Support">Customer Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Mode
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Remote (Worldwide)">Remote (Worldwide)</option>
                  <option value="Remote (Africa)">Remote (Africa)</option>
                  <option value="Hybrid (Lagos)">Hybrid (Lagos)</option>
                  <option value="Hybrid (Abuja)">Hybrid (Abuja)</option>
                  <option value="Full-time Onsite">Full-time Onsite</option>
                </select>
              </div>
            </div>

            {/* Field 4: Target Salary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Salary / Rate (Optional)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={salaryExpectation}
                  onChange={(e) => setSalaryExpectation(e.target.value)}
                  placeholder="e.g. ₦150k - ₦250k/month or $3,000/mo"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Field 5: Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your WhatsApp or Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Field 6: Details / Skills */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Key Skills & Role Details
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mention specific tools (Figma, React, Google Workspace), years of experience, or urgency..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Destination Info Box */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Direct delivery to:</span>
              </span>
              <span className="font-bold text-blue-700">{contactEmail}</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !roleTitle.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-xs shadow-xs active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
