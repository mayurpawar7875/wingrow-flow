import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import wingrowLogo from '@/assets/wingrow-market-logo.png';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const usernameRaw = formData.get('username') as string;
    const passwordRaw = formData.get('password') as string;

    const username = (usernameRaw ?? '').trim().toLowerCase();
    const password = (passwordRaw ?? '').trim();

    try {
      loginSchema.parse({ username, password });
      
      const { error } = await signIn(username, password);
      
      if (error) {
        toast.error('Invalid username or password');
      } else {
        toast.success('Logged in successfully');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('An error occurred during login');
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
              <img 
                src={wingrowLogo} 
                alt="Wingrow Market" 
                className="h-24 w-auto mx-auto mb-4"
              />
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
                  <Input 
                    id="login-username" 
                    name="username" 
                    type="text" 
                    placeholder="Username" 
                    className="pl-10 h-12 border-border" 
                    required 
                    autoComplete="username" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="login-password" 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Password" 
                    className="pl-10 pr-10 h-12 border-border" 
                    required 
                    autoComplete="current-password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base" 
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-4">
                Only registered employees and admin can log in.
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>;
}