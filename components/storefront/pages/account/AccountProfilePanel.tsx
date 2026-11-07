'use client';

import {
  Check,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  StoreButton,
  StoreInputField,
  StoreSurfaceCard,
} from '@/components/storefront/ui';

type Props = {
  email: string;
  profileName: string;
  onProfileName: (v: string) => void;
  nameError?: string;
  profilePhone: string;
  onProfilePhone: (v: string) => void;
  phoneError?: string;
  profileError?: string | null;
  profileBusy: boolean;
  profileSaved: boolean;
  isNameValid: boolean;
  isPhoneValid: boolean;
  onSaveProfile: (e: React.FormEvent) => void;
  currentPassword: string;
  onCurrentPassword: (v: string) => void;
  newPassword: string;
  onNewPassword: (v: string) => void;
  confirmPassword: string;
  onConfirmPassword: (v: string) => void;
  passwordError?: string;
  passwordBusy: boolean;
  passwordSaved: boolean;
  onUpdatePassword: (e: React.FormEvent) => void;
};

export function AccountProfilePanel({
  email,
  profileName,
  onProfileName,
  nameError,
  profilePhone,
  onProfilePhone,
  phoneError,
  profileError,
  profileBusy,
  profileSaved,
  isNameValid,
  isPhoneValid,
  onSaveProfile,
  currentPassword,
  onCurrentPassword,
  newPassword,
  onNewPassword,
  confirmPassword,
  onConfirmPassword,
  passwordError,
  passwordBusy,
  passwordSaved,
  onUpdatePassword,
}: Props) {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-slate-900 m-0">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 space-y-4">
          <StoreSurfaceCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Account Details
              </h2>
              {profileSaved ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Saved</span>
                </span>
              ) : null}
            </div>

            <form onSubmit={onSaveProfile} className="space-y-3.5">
              <StoreInputField
                label="Full Name"
                required
                icon={User}
                value={profileName}
                onChange={(e) => onProfileName(e.target.value)}
                error={nameError}
              />

              <StoreInputField
                label="Email"
                icon={Mail}
                value={email}
                disabled
                rightElement={
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <Lock size={10} />
                    <span>Locked</span>
                  </span>
                }
              />

              <StoreInputField
                label="Phone / WhatsApp (BD)"
                required
                icon={Phone}
                value={profilePhone}
                onChange={(e) => onProfilePhone(e.target.value)}
                error={phoneError}
                placeholder="017XXXXXXXX"
              />

              {profileError ? (
                <p role="alert" className="m-0 text-sm font-semibold text-rose-600">
                  {profileError}
                </p>
              ) : null}

              <div className="pt-1">
                <StoreButton
                  type="submit"
                  variant="dark"
                  size="sm"
                  disabled={!isNameValid || !isPhoneValid || profileBusy}
                >
                  <Check size={13} />
                  <span>{profileBusy ? 'Saving…' : 'Save Changes'}</span>
                </StoreButton>
              </div>
            </form>
          </StoreSurfaceCard>
        </div>

        <div className="lg:col-span-5">
          <StoreSurfaceCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 m-0">Password</h2>
              {passwordSaved ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>Updated</span>
                </span>
              ) : null}
            </div>

            <form onSubmit={onUpdatePassword} className="space-y-3">
              <StoreInputField
                type="password"
                label="Current Password"
                required
                value={currentPassword}
                onChange={(e) => onCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />

              <StoreInputField
                type="password"
                label="New Password"
                required
                value={newPassword}
                onChange={(e) => onNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />

              <StoreInputField
                type="password"
                label="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => onConfirmPassword(e.target.value)}
                error={passwordError}
                placeholder="Re-enter password"
              />

              <div className="pt-1">
                <StoreButton
                  type="submit"
                  variant="dark"
                  size="sm"
                  disabled={passwordBusy}
                >
                  <KeyRound size={13} />
                  <span>{passwordBusy ? 'Saving…' : 'Update Password'}</span>
                </StoreButton>
              </div>
            </form>
          </StoreSurfaceCard>
        </div>
      </div>
    </div>
  );
}
