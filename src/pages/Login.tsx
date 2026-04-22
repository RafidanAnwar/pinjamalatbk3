import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { runServerFunction } from '@/lib/gas';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!username || !password) {
      toast({ title: 'Gagal', description: 'Username dan Password wajib diisi', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const res = await runServerFunction('authenticatePetugas', username, password);
      
      if (res.success) {
         localStorage.setItem('auth_token', res.token);
         toast({ title: 'Login Berhasil', description: `Selamat datang, ${res.user.nama_petugas}` });
         navigate('/admin');
      } else {
         toast({ title: 'Login Gagal', description: res.error || 'Username atau password salah', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Gagal terhubung ke server', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      
      <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800 shadow-2xl relative z-10">
        <CardHeader className="space-y-4 pb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-white mb-2">Login Petugas</CardTitle>
            <CardDescription className="text-slate-400">
              Masuk untuk mengelola katalog alat dan memonitor data peminjaman.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">Username</Label>
              <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                 <Input 
                   type="text" 
                   value={username} onChange={e => setUsername(e.target.value)}
                   className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-600 shadow-inner" 
                   placeholder="admin_balai" 
                 />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <div className="relative">
                 <Input 
                   type={showPassword ? "text" : "password"} 
                   value={password} onChange={e => setPassword(e.target.value)}
                   className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-blue-600 shadow-inner" 
                   placeholder="••••••••" 
                 />
                 <button 
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                 >
                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
              </div>
            </div>
            
            <Button 
               type="submit" 
               disabled={isSubmitting} 
               className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] mt-4 transition-all"
            >
              {isSubmitting ? 'Verifikasi...' : 'Masuk ke Dashboard'}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <Button variant="link" onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-300">
               Kembali ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
