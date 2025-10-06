import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import wingrowLogo from '@/assets/wingrow-market-logo.png';
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});
export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const {
    signIn,
    user
  } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard');
    return null;
  }
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      loginSchema.parse({
        email,
        password
      });
      const {
        error
      } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Logged in successfully');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md mx-auto">
        <Card className="w-full shadow-lg border-0">
          <CardContent className="pt-8 pb-6 px-6">
            <div className="text-center mb-8">
              
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Wingrow Inventory
              </h1>
              <p className="text-muted-foreground text-sm">
                Empowering Smarter Market Operations
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-username" name="email" type="email" placeholder="Username" className="pl-10 h-12 border-border" required autoComplete="username" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" className="pl-10 pr-10 h-12 border-border" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => toast.info('Please contact support to reset your password')}>
                  Forgot Password?
                </button>
              </div>

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => toast.info('Contact support at: wingrowagritech@gmail.com')}>
                Contact Support
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}