'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Monitor, Loader2, Eye, EyeOff, Sun, Moon, ShieldCheck, User } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { toast } from 'sonner';
import { logActivity } from '@/lib/api';
import Image from "next/image";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, profile, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('clbs-remember');
    if (saved) {
      setUsername(saved);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard');
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password.');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(username, password);
    if (error) {
      toast.error(error === 'Invalid login credentials' ? 'Invalid username or password.' : error);
      setSubmitting(false);
      return;
    }
    if (remember) localStorage.setItem('clbs-remember', username);
    else localStorage.removeItem('clbs-remember');
    await logActivity('login', `User "${username}" logged in`);
    toast.success('Welcome back!');
    // redirect handled by effect
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden lg:flex bg-[#FAF8F4]">
      {/* LEFT DESIGN PANEL (Desktop only) */}
      <div className="hidden lg:flex lg:w-[51.2%] lg:min-h-screen relative overflow-hidden bg-[#FAF8F4]">

        {/* ---------------------------------------------------------
          TOP MAROON ARC (Desktop only)
      --------------------------------------------------------- */}
        <div
          className="
          absolute
          -top-[430px]
          -left-[230px]
          w-[1050px]
          h-[600px]
          rounded-[50%]
          bg-[#850019]
          border-b-[4px]
          border-[#D4A72C]
          z-[3]
          lg:block hidden
        "
        />

        {/* ---------------------------------------------------------
          GOLD DOT PATTERN (Desktop only)
      --------------------------------------------------------- */}
        <div
          className="
          absolute
          top-0
          right-0
          w-[55%]
          h-[48%]
          z-[1]
          opacity-[0.55]
          lg:block hidden
        "
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(212,167,44,0.38) 2px, transparent 2px)",
            backgroundSize: "18px 18px",
            maskImage:
              "linear-gradient(to bottom, black 0%, transparent 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, transparent 90%)",
          }}
        />

        {/* ---------------------------------------------------------
          CAMPUS IMAGE (Desktop only)
      --------------------------------------------------------- */}
        <div className="absolute inset-0 z-[0] pointer-events-none lg:block hidden">

          <Image
            src="/images/campus.jpg"
            alt="Liceo de Cagayan University Campus"
            fill
            priority
            sizes="51vw"
            className="
            object-cover
            object-[65%_65%]
            opacity-[0.13]
          "
          />

          {/* cream wash */}
          <div className="absolute inset-0 bg-[#FAF8F4]/35" />

          {/* right fade */}
          <div
            className="
            absolute inset-0
            bg-gradient-to-r
            from-[#FAF8F4]/20
            via-[#FAF8F4]/30
            to-[#FAF8F4]/95
          "
          />

          {/* top fade */}
          <div
            className="
            absolute inset-0
            bg-gradient-to-b
            from-[#FAF8F4]/10
            via-transparent
            to-[#FAF8F4]/55
          "
          />
        </div>

        {/* Mobile campus image - simplified */}
        <div className="lg:hidden absolute inset-0 z-[0] pointer-events-none">
          <Image
            src="/images/campus.jpg"
            alt="Liceo de Cagayan University Campus"
            fill
            priority
            className="object-cover object-center opacity-[0.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4] via-[#FAF8F4]/80 to-[#FAF8F4]" />
        </div>

        {/* ---------------------------------------------------------
          BRAND CONTENT - Desktop
      --------------------------------------------------------- */}
        <div className="relative z-[10] w-full px-[56px] xl:px-[62px] pt-[118px] lg:block hidden">

          {/* LOGO + DITLS */}
          <div className="flex items-center">

            <Image
              src="/images/Ldcu_seal.png"
              alt="Liceo Logo"
              width={155}
              height={155}
              priority
              className="object-contain"
            />

            <div
              className="
              h-[140px]
              w-[2px]
              bg-[#D4A72C]
              mx-[30px]
            "
            />

            <div>

              <h2
                className="
                text-[34px]
                font-extrabold
                tracking-tight
                text-[#7A0018]
              "
              >
                DITLS
              </h2>

              <p
                className="
                mt-2
                text-[19px]
                leading-7
                text-[#303030]
              "
              >
                Department of Integrated
                <br />
                Technology and Life Skills
              </p>

            </div>
          </div>

          {/* -------------------------------------------------------
            MAIN TITLE
        ------------------------------------------------------- */}
          <div className="mt-[42px] max-w-[650px]">

            <h1
              className="
              text-[47px]
              xl:text-[50px]
              font-extrabold
              leading-[1.06]
              tracking-[-1.8px]
              text-[#7A0018]
            "
            >
              Computer &amp; Robotics
              <br />
              Laboratory Booking
              <br />
              System
            </h1>

            {/* DESCRIPTION */}
            <p
              className="
              mt-[20px]
              max-w-[620px]
              text-[17px]
              leading-[1.55]
              text-[#292929]
            "
            >
              Developed by{" "}
              <span className="font-bold text-[#7A0018]">
                WEBDev Raymund Luceño
              </span>{" "}
              exclusively for{" "}
              <span className="font-bold text-[#7A0018]">
                Liceo Department of Integrated Technology and Life Skills
              </span>{" "}
              faculty members to streamline Computer and Robotics
              Laboratory reservations.
            </p>

            {/* -----------------------------------------------------
              FEATURES
          ----------------------------------------------------- */}
            <div className="mt-[28px] space-y-[12px]">

              {/* Feature 1 */}
              <div className="flex items-center gap-[16px]">

                <div
                  className="
                  w-[52px]
                  h-[52px]
                  rounded-full
                  bg-[#FFF3DC]
                  border
                  border-[#E7C77A]
                  flex
                  items-center
                  justify-center
                  text-[#8B001B]
                "
                >
                  <ShieldCheck className="w-[23px] h-[23px]" />
                </div>

                <span className="text-[17px] text-[#303030]">
                  Real-time conflict detection
                </span>

              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-[16px]">

                <div
                  className="
                  w-[52px]
                  h-[52px]
                  rounded-full
                  bg-[#FFF3DC]
                  border
                  border-[#E7C77A]
                  flex
                  items-center
                  justify-center
                  text-[#8B001B]
                "
                >
                  <User className="w-[23px] h-[23px]" />
                </div>

                <span className="text-[17px] text-[#303030]">
                  Role-based access control
                </span>

              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-[16px]">

                <div
                  className="
                  w-[52px]
                  h-[52px]
                  rounded-full
                  bg-[#FFF3DC]
                  border
                  border-[#E7C77A]
                  flex
                  items-center
                  justify-center
                  text-[#8B001B]
                "
                >
                  <Monitor className="w-[23px] h-[23px]" />
                </div>

                <span className="text-[17px] text-[#303030]">
                  Calendar &amp; schedule management
                </span>

              </div>

              {/* Feature 4 */}
              <div className="flex items-center gap-[16px]">

                <div
                  className="
                  w-[52px]
                  h-[52px]
                  rounded-full
                  bg-[#FFF3DC]
                  border
                  border-[#E7C77A]
                  flex
                  items-center
                  justify-center
                  text-[#8B001B]
                "
                >
                  <ShieldCheck className="w-[23px] h-[23px]" />
                </div>

                <span className="text-[17px] text-[#303030]">
                  Instant notifications
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* ---------------------------------------------------------
          MOBILE/TABLET COMPACT BRANDING
      --------------------------------------------------------- */}
        <div className="lg:hidden flex flex-col items-center justify-center p-6 pt-10">
          {/* Campus image overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/campus.jpg"
              alt="Liceo de Cagayan University Campus"
              fill
              priority
              className="object-cover object-center opacity-[0.1]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4] via-[#FAF8F4]/80 to-[#FAF8F4]" />
          </div>

          <div className="relative z-10 w-full max-w-md px-4 text-center">
            {/* Logo + DITLS */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <Image
                src="/images/Ldcu_seal.png"
                alt="Liceo Logo"
                width={100}
                height={100}
                priority
                className="object-contain"
              />

              <div className="w-full h-px bg-[#D4A72C] max-w-xs" />

              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-[#7A0018]">
                  DITLS
                </h2>
                <p className="mt-1 text-base leading-6 text-[#303030]">
                  Department of Integrated<br />Technology and Life Skills
                </p>
              </div>
            </div>

            {/* Main Title */}
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-[#7A0018] text-balance">
                Computer & Robotics<br />Laboratory Booking<br />System
              </h1>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base leading-relaxed text-[#292929] mb-6 max-w-md mx-auto">
              Developed by <span className="font-bold text-[#7A0018]">WEBDev Raymund Luceño</span> exclusively for <span className="font-bold text-[#7A0018]">Liceo Department of Integrated Technology and Life Skills</span> faculty members to streamline Computer and Robotics Laboratory reservations.
            </p>

            {/* Features - compact */}
            <div className="space-y-3 max-w-md mx-auto">
              {[
                { icon: ShieldCheck, text: "Real-time conflict detection" },
                { icon: User, text: "Role-based access control" },
                { icon: Monitor, text: "Calendar & schedule management" },
                { icon: ShieldCheck, text: "Instant notifications" },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-[#E5D7BD] shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#FFF3DC] border border-[#E7C77A] flex items-center justify-center text-[#8B001B] flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm text-[#303030] font-medium">{text}</span>
                </div>
              ))}
            </div>

            {/* Maroon accent bar */}
            <div className="mt-8 h-2 bg-gradient-to-r from-[#850019] to-[#650014] rounded-full opacity-60" />
          </div>
        </div>

        {/* ---------------------------------------------------------
          BOTTOM MAROON SHAPE
      --------------------------------------------------------- */}
        <div
          className="
          absolute
          z-[5]
          -left-[13%]
          -bottom-[49%]
          w-[126%]
          h-[67%]
          rounded-[50%]
          bg-[#850019]
          border-t-[5px]
          border-[#D4A72C]
        "
        />

        {/* Darker bottom layer */}
        <div
          className="
          absolute
          z-[4]
          -left-[13%]
          -bottom-[55%]
          w-[126%]
          h-[30%]
          rounded-[50%]
          bg-[#650014]
        "
        />

        {/* Bottom dotted pattern */}
        <div
          className="
          absolute
          z-[6]
          left-[45%]
          bottom-[-2%]
          w-[55%]
          h-[28%]
          opacity-[0.16]
        "
          style={{
            backgroundImage:
              "radial-gradient(circle, #D4A72C 2px, transparent 2px)",
            backgroundSize: "18px 18px",
          }}
        />

      </div>


      {/* =========================================================
        RIGHT LOGIN PANEL
    ========================================================= */}
      <div
        className="
        w-full lg:flex-1
        min-h-screen
        bg-white
        relative
        flex
        items-center
        justify-center
        px-4 sm:px-6 lg:px-8 xl:px-12
      "
      >

        {/* Theme button */}
        <button
          onClick={toggleTheme}
          className="
          absolute
          top-4 sm:top-6 right-4 sm:right-6
          w-11 h-11 sm:w-12 sm:h-12
          rounded-full
          border
          border-[#D9D9D9]
          bg-white
          flex
          items-center
          justify-center
          shadow-sm
          hover:shadow-md
          transition
        "
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5 sm:h-6 sm:w-6 text-[#7A0018]" />
          ) : (
            <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-[#7A0018]" />
          )}
        </button>


        {/* LOGIN CONTENT */}
        <div className="w-full max-w-[520px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Image
              src="/images/Ldcu_seal.png"
              alt="Liceo Logo"
              width={70}
              height={70}
              priority
            />
          </div>


          {/* Welcome */}
          <div className="mb-10 sm:mb-12">

            <h2
              className="
              text-3xl sm:text-4xl
              font-extrabold
              tracking-tight
              text-[#7A0018]
            "
            >
              Welcome Back
            </h2>

            <p className="mt-4 text-base sm:text-lg text-[#68717D]">
              Sign in to access your dashboard
            </p>

          </div>


          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">

            {/* Username */}
            <div className="space-y-[10px]">

              <Label
                htmlFor="username"
                className="text-[17px] font-bold text-[#171717]"
              >
                Username
              </Label>

              <div className="relative">

                <User
                  className="
                  absolute
                  left-[22px]
                  top-1/2
                  -translate-y-1/2
                  h-[22px]
                  w-[22px]
                  text-[#303030]
                "
                />

                <Input
                  id="username"
                  placeholder="Enter your username"
                  className="
                  h-14 sm:h-16
                  pl-12 sm:pl-14
                  text-base sm:text-lg
                  rounded-xl
                  border-[#E8B7BE]
                  focus-visible:ring-[#8B001B]
                  focus-visible:border-[#8B001B]
                "
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />

              </div>

            </div>


            {/* Password */}
            <div className="space-y-[10px]">

              <Label
                htmlFor="password"
                className="text-[17px] font-bold text-[#171717]"
              >
                Password
              </Label>

              <div className="relative">

                <ShieldCheck
                  className="
                  absolute
                  left-[22px]
                  top-1/2
                  -translate-y-1/2
                  h-[22px]
                  w-[22px]
                  text-[#303030]
                "
                />

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="
                  h-14 sm:h-16
                  pl-12 sm:pl-14
                  pr-12 sm:pr-14
                  text-base sm:text-lg
                  rounded-xl
                  border-[#E8B7BE]
                  focus-visible:ring-[#8B001B]
                  focus-visible:border-[#8B001B]
                "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="
                  absolute
                  right-[22px]
                  top-1/2
                  -translate-y-1/2
                  text-[#555]
                  hover:text-[#7A0018]
                "
                >
                  {showPassword ? (
                    <EyeOff className="h-[21px] w-[21px]" />
                  ) : (
                    <Eye className="h-[21px] w-[21px]" />
                  )}
                </button>

              </div>

            </div>


            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                  className="
                  h-5 w-5 sm:h-5.5 sm:w-5.5
                  border-[#8B001B]
                  data-[state=checked]:bg-[#8B001B]
                  data-[state=checked]:border-[#8B001B]
                "
                />

                <Label
                  htmlFor="remember"
                  className="text-sm sm:text-base cursor-pointer text-[#303030]"
                >
                  Remember Me
                </Label>

              </div>

              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="
                text-sm sm:text-base
                font-medium
                text-[#8B001B]
                hover:text-[#650014]
              "
              >
                Forgot Password?
              </button>

            </div>


            {/* SIGN IN */}
            <Button
              type="submit"
              disabled={submitting}
              className="
              w-full
              h-14 sm:h-16
              rounded-xl
              bg-[#8B001B]
              hover:bg-[#700016]
              text-white
              text-base sm:text-lg
              font-bold
              shadow-[0_7px_18px_rgba(139,0,27,0.20)]
            "
            >

              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}

            </Button>

          </form>


          {/* FOOTER */}
          <div className="mt-10 sm:mt-16">

            <div className="flex items-center justify-center gap-3">

              <div className="h-px bg-[#E5D7BD] flex-1" />

              <div className="text-[#D4A72C] text-2xl sm:text-3xl">
                ❖
              </div>

              <div className="h-px bg-[#E5D7BD] flex-1" />

            </div>

            <div className="text-center mt-4 sm:mt-6">

              <p className="text-sm sm:text-base text-[#68717D]">
                © 2026 Liceo De Cagayan University
              </p>

              <p
                className="
                mt-2
                text-sm sm:text-base
                tracking-[3px]
                italic
                text-[#8B001B]
              "
              >
                NIL SINE NUMINE
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* =========================================================
        FORGOT PASSWORD
    ========================================================= */}
      {forgotOpen && (
        <div
          className="
          fixed
          inset-0
          z-50
          flex
          items-center
          justify-center
          bg-black/50
        "
          onClick={() => setForgotOpen(false)}
        >

          <div
            className="
            bg-white
            rounded-xl
            p-6
            max-w-md
            w-full
            mx-4
            shadow-2xl
          "
            onClick={(e) => e.stopPropagation()}
          >

            <h3 className="text-lg font-semibold text-[#7A0018] mb-2">
              Forgot Password
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              Please contact your system administrator to reset your password.
              Teachers cannot self-reset passwords.
            </p>

            <Button
              onClick={() => setForgotOpen(false)}
              className="w-full bg-[#8B001B] hover:bg-[#650014]"
            >
              Got it
            </Button>

          </div>

        </div>
      )}

    </div>
  );
}