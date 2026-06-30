import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader, Lock, Eye, EyeOff, X } from 'lucide-react';
import Swal from 'sweetalert2';
import {
  fetchFinalExamQuestionPaperAccessMeta,
  verifyFinalExamQuestionPaperAccess
} from '../../features/master/masterSlice';
import { useUserRights } from '../../hooks/useUserRights';
import { showPermissionDenied } from '../../utils/permissionAlert';

const ACCESS_KEY_PREFIX = 'finalExamQuestionPaperAccessVerified';

const getAccessKey = (user) => {
  const userId = user?._id || user?.id || user?.username || user?.email || 'anonymous';
  return `${ACCESS_KEY_PREFIX}:${userId}`;
};

const FinalExamQuestionPaperAccessGate = ({ children, requiredAction = 'view' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { finalExamQuestionPaperAccess } = useSelector((state) => state.master);
  const permissions = useUserRights('Final Exam Question Paper');
  const permissionSignature = `${Number(permissions.view)}:${Number(permissions.add)}:${Number(permissions.edit)}:${Number(permissions.delete)}`;

  const isSuperAdmin = user?.role === 'Super Admin' || user?.type === 'Super Admin';
  const [loading, setLoading] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  useEffect(() => {
    const init = async () => {
      const allowed = permissions[requiredAction] || (requiredAction === 'view' && permissions.view);

      if (!allowed) {
        await showPermissionDenied("You don't have authority for this page.");
        navigate('/home', { replace: true });
        return;
      }

      if (isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        const action = await dispatch(fetchFinalExamQuestionPaperAccessMeta());
        const hasPassword = Boolean(action.payload?.hasPassword);
        const isEnabled = Boolean(action.payload?.isEnabled);

        if (!isEnabled || !hasPassword) {
          setLoading(false);
          return;
        }

        if (sessionStorage.getItem(getAccessKey(user)) === 'true') {
          setLoading(false);
          return;
        }

        setAttemptsLeft(3);
        setPassword('');
        setShowPassword(false);
        setPromptOpen(true);
      } catch {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [dispatch, isSuperAdmin, navigate, permissionSignature, requiredAction, user]);

  const closePrompt = () => {
    setPromptOpen(false);
    navigate('/home', { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(password || '').trim()) {
      Swal.fire({ icon: 'warning', title: 'Password required', text: 'Please enter the final exam password.' });
      return;
    }

    const result = await dispatch(verifyFinalExamQuestionPaperAccess({ password }));
    if (verifyFinalExamQuestionPaperAccess.fulfilled.match(result)) {
      sessionStorage.setItem(getAccessKey(user), 'true');
      setPromptOpen(false);
      setLoading(false);
      return;
    }

    const nextAttempts = attemptsLeft - 1;
    setAttemptsLeft(nextAttempts);
    setPassword('');

    if (nextAttempts <= 0) {
      await Swal.fire({
        icon: 'error',
        title: 'Access denied',
        text: 'Incorrect password entered 3 times. Returning to home.'
      });
      navigate('/home', { replace: true });
      return;
    }

    Swal.fire({
      icon: 'error',
      title: 'Incorrect password',
      text: `Wrong password. ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} left.`
    });
  };

  if (loading) {
    return (
      <div className="min-h-[55vh] flex items-center justify-center text-gray-500">
        <Loader className="animate-spin mr-2" size={20} /> Loading...
      </div>
    );
  }

  const canRenderChildren = !promptOpen;

  return (
    <>
      {canRenderChildren && children}

      {promptOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b bg-blue-600 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <Lock size={18} />
                <h3 className="text-base font-black">Final Exam Access</h3>
              </div>
              <button type="button" onClick={closePrompt} className="rounded-full p-1 hover:bg-white/15">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <p className="text-sm text-gray-600">
                Final exam question paper open karne ke liye password enter karein.
              </p>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-500">Attempts left: {attemptsLeft}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closePrompt}
                    className="rounded-lg border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FinalExamQuestionPaperAccessGate;
