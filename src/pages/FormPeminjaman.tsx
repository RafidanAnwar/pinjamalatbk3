import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, Plus, UploadCloud, Calendar, User, Mail, MapPin, ShieldCheck, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { runServerFunction } from '@/lib/gas';

import bgImg from '@/assets/background.png';
import logoImg from '@/assets/logo.png';
import labImg from '@/assets/lab.png';

interface Alat {
  kode_alat: string;
  nama: string;
  kondisi: string;
  ketersediaan: string;
}

const formSchema = z.object({
  nama_peminjam: z.string().min(3, { message: 'Nama harus diisi minimal 3 karakter' }),
  email: z.string().email({ message: 'Email tidak valid' }),
  lokasi: z.string().min(3, { message: 'Lokasi harus diisi' }),
  jenis_pengujian: z.string().min(1, { message: 'Pilih jenis pengujian' }),
  nomor_surat: z.string().min(1, { message: 'Nomor surat harus diisi' }),
  tgl_pinjam: z.string().min(1, { message: 'Tanggal Pinjam harus diisi' }),
  tgl_kembali: z.string().min(1, { message: 'Tanggal Kembali harus diisi' }),
  detail: z.array(z.object({
    kode_alat: z.string().min(1, { message: 'Pilih alat' }),
    jumlah: z.number().min(1, { message: 'Minimal 1' })
  })).min(1, { message: 'Minimal pilih 1 alat' })
});

type FormValues = z.infer<typeof formSchema>;

export default function FormPeminjaman() {
  const navigate = useNavigate();
  const [fileSurat, setFileSurat] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [katalogAlat, setKatalogAlat] = useState<Alat[]>([]);
  const [isLoadingAlat, setIsLoadingAlat] = useState(true);

  // Status Login Modal
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  // Status Success Modal
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successId, setSuccessId] = useState('');

  const fetchKatalogAlat = () => {
    setIsLoadingAlat(true);
    runServerFunction('getKatalogAlat')
      .then(res => {
        if (res.success) {
          setKatalogAlat(res.data);
        } else {
          toast({ title: 'Gagal Memuat Alat', description: res.error, variant: 'destructive' });
        }
      })
      .catch(err => {
        toast({ title: 'Gagal Memuat Alat', description: err.message, variant: 'destructive' });
      })
      .finally(() => setIsLoadingAlat(false));
  };

  useEffect(() => {
    fetchKatalogAlat();
  }, []);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_peminjam: '',
      email: '',
      lokasi: '',
      jenis_pengujian: '',
      nomor_surat: '',
      tgl_pinjam: '',
      tgl_kembali: '',
      detail: [{ kode_alat: '', jumlah: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detail'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!loginUsername || !loginPassword) {
      toast({ title: 'Gagal', description: 'Username dan Password wajib diisi', variant: 'destructive' });
      return;
    }

    setIsLoginSubmitting(true);
    try {
      const res = await runServerFunction('authenticatePetugas', loginUsername, loginPassword);
      if (res.success) {
         localStorage.setItem('auth_token', res.token);
         toast({ title: 'Login Berhasil', description: `Selamat datang, ${res.user.nama_petugas}` });
         setIsLoginOpen(false);
         navigate('/admin');
      } else {
         toast({ title: 'Login Gagal', description: res.error || 'Username atau password salah', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Gagal terhubung ke server', variant: 'destructive' });
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!fileSurat) {
      toast({ title: 'Gagal', description: 'Surat tugas wajib diunggah!', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileSurat);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
      
      // Menggabungkan request ke GAS untuk efisiensi (menghindari jeda antar panggilan)
      const dataPeminjaman = {
        nama_peminjam: data.nama_peminjam,
        email: data.email,
        lokasi: data.lokasi,
        jenis_pengujian: data.jenis_pengujian,
        nomor_surat: data.nomor_surat,
        tgl_pinjam: data.tgl_pinjam,
        tgl_kembali: data.tgl_kembali
      };
      
      const fileInfo = {
        base64Data,
        fileName: fileSurat.name,
        mimeType: fileSurat.type
      };
      
      // Kirim semuanya sekaligus
      const submitRes = await runServerFunction('submitPeminjamanLengkap', dataPeminjaman, data.detail, fileInfo);

      if (!submitRes.success) {
         throw new Error(submitRes.error || 'Gagal menyimpan data ke Sheets.');
      }
      
      setSuccessId(submitRes.id_transaksi);
      setIsSuccessOpen(true);
      reset();
      setFileSurat(null);
      fetchKatalogAlat();
      
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Terjadi kesalahan saat memproses form', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen py-10 px-4 flex justify-center relative"
      style={{
        backgroundImage: `url(${bgImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-none" />

      <div className="z-10 relative w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Sidebar Info Panel */}
        <div className="w-full lg:w-1/3 bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/50 flex flex-col items-center text-center space-y-6 lg:sticky lg:top-10">
          <img 
            src={logoImg} 
            alt="Logo Balai K3" 
            className="h-28 w-auto drop-shadow-md"
            style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(202deg) brightness(97%) contrast(105%)' }}
          />
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Sistem Peminjaman</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Kelola peralatan sampling K3 dengan mudah. Ajukan peminjaman atau login sebagai petugas untuk monitoring.</p>
          </div>
          <img src={labImg} alt="Laboratorium" className="w-full object-cover rounded-xl shadow-inner mt-2 border border-slate-100" />
          
          <div className="w-full pt-6 border-t border-slate-200">
             <Button 
               type="button" 
               variant="outline" 
               className="w-full flex items-center justify-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 h-11" 
               onClick={() => setIsLoginOpen(true)}
             >
                <User size={18} /> Login Petugas
             </Button>
          </div>
        </div>

        {/* Formulir Panel */}
        <Card className="w-full lg:w-2/3 shadow-2xl border-0 overflow-hidden bg-white">
          <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
          <CardHeader className="bg-slate-50/50 px-8 pt-8 pb-6 border-b border-slate-100">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-800">Form Peminjaman Alat</CardTitle>
            <CardDescription className="text-base mt-2 whitespace-pre-wrap">
              Isi formulir di bawah ini dengan lengkap untuk mengajukan peminjaman peralatan sampling.
            </CardDescription>
          </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Seksi Informasi Peminjam */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <User size={18} className="text-blue-600" /> Informasi Peminjam
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input placeholder="John Doe" {...register('nama_peminjam')} className={errors.nama_peminjam ? "border-red-500" : ""} />
                  {errors.nama_peminjam && <p className="text-sm text-red-500">{errors.nama_peminjam.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label>Email Instansi / Pribadi</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="john@example.com" type="email" {...register('email')} className={`pl-9 ${errors.email ? "border-red-500" : ""}`} />
                  </div>
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Lokasi Sampling</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="PT Maju Jaya, Kawasan Industri..." {...register('lokasi')} className={`pl-9 ${errors.lokasi ? "border-red-500" : ""}`} />
                  </div>
                  {errors.lokasi && <p className="text-sm text-red-500">{errors.lokasi.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Jenis Pengujian</Label>
                  <select 
                    {...register('jenis_pengujian')} 
                    className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${errors.jenis_pengujian ? "border-red-500" : ""}`}
                  >
                    <option value="">-- Pilih Jenis --</option>
                    <option value="PNBP">PNBP</option>
                    <option value="DIPA">DIPA</option>
                    <option value="Praktik">Praktik</option>
                  </select>
                  {errors.jenis_pengujian && <p className="text-sm text-red-500">{errors.jenis_pengujian.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Nomor Surat Tugas</Label>
                  <Input placeholder="ST/01/2026..." {...register('nomor_surat')} className={errors.nomor_surat ? "border-red-500" : ""} />
                  {errors.nomor_surat && <p className="text-sm text-red-500">{errors.nomor_surat.message}</p>}
                </div>
              </div>
            </div>

            {/* Waktu & Dokumen */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2 border-b pb-2">
                <Calendar size={18} className="text-blue-600" /> Waktu Pelaksanaan & Dokumen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label>Tanggal Pinjam</Label>
                    <Input type="date" {...register('tgl_pinjam')} className={errors.tgl_pinjam ? "border-red-500" : ""} />
                    {errors.tgl_pinjam && <p className="text-sm text-red-500">{errors.tgl_pinjam.message}</p>}
                 </div>
                 <div className="space-y-2">
                    <Label>Tanggal Kembali</Label>
                    <Input type="date" {...register('tgl_kembali')} className={errors.tgl_kembali ? "border-red-500" : ""} />
                    {errors.tgl_kembali && <p className="text-sm text-red-500">{errors.tgl_kembali.message}</p>}
                 </div>
                 <div className="space-y-2 md:col-span-2">
                    <Label className="flex justify-between">Upload Surat Tugas (PDF/Image) <span className="text-xs text-slate-400 font-normal">Wajib diisi</span></Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                       <UploadCloud className="h-8 w-8 text-blue-500 mb-2" />
                       <span className="text-sm text-slate-600 font-medium">{fileSurat ? fileSurat.name : 'Klik untuk upload atau drag and drop'}</span>
                       <Input type="file" className="absolute opacity-0 w-full h-[100px] cursor-pointer" accept="image/*, .pdf" onChange={(e) => setFileSurat(e.target.files?.[0] || null)} />
                    </div>
                 </div>
              </div>
            </div>

            {/* Detail Pemesanan */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b pb-2">
                <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                   Daftar Alat
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ kode_alat: '', jumlah: 1 })} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-1" /> Tambah Alat
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex-1 space-y-2">
                       <Label>Nama / Kode Alat</Label>
                       <select 
                         {...register(`detail.${index}.kode_alat`)} 
                         className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                       >
                         <option value="">{isLoadingAlat ? "Memuat alat..." : "-- Pilih Alat --"}</option>
                         {katalogAlat
                            .filter(a => a.ketersediaan === 'Ready')
                            .map(a => <option key={a.kode_alat} value={a.kode_alat}>{a.kode_alat} - {a.nama} ({a.kondisi})</option>)
                         }
                       </select>
                       {errors?.detail?.[index]?.kode_alat && <p className="text-sm text-red-500">{errors.detail[index].kode_alat.message}</p>}
                    </div>
                    
                    <div className="w-24 space-y-2">
                       <Label>Jumlah</Label>
                       <Input type="number" min="1" {...register(`detail.${index}.jumlah`, { valueAsNumber: true })} />
                    </div>

                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5">
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 transition shadow-md">
                {isSubmitting ? 'Memproses...' : 'Kirim Permohonan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>

      {/* Login Modal */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-slate-800">Login Petugas</DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              Masuk untuk mengelola katalog alat dan monitor transaksi peminjaman.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Username</Label>
              <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                 <Input 
                   value={loginUsername} onChange={e => setLoginUsername(e.target.value)} 
                   className="pl-10" placeholder="admin_balai" 
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Password</Label>
              <div className="relative">
                 <Input 
                   type={showLoginPassword ? "text" : "password"} 
                   value={loginPassword} onChange={e => setLoginPassword(e.target.value)} 
                   placeholder="••••••••" 
                   className="pr-10"
                 />
                 <button 
                   type="button"
                   onClick={() => setShowLoginPassword(!showLoginPassword)}
                   className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700"
                 >
                   {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                 </button>
              </div>
            </div>
            <Button type="submit" disabled={isLoginSubmitting} className="w-full mt-2 h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
               {isLoginSubmitting ? 'Verifikasi...' : 'Masuk ke Dashboard'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-800 text-center">Permohonan Terkirim!</DialogTitle>
            <DialogDescription className="text-base text-slate-600 text-center">
              Permintaan peminjaman alat Anda telah berhasil dikirim.
            </DialogDescription>
            <Button onClick={() => setIsSuccessOpen(false)} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white shadow-md">
               Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
