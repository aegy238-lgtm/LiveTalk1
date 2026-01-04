
import React, { useState } from 'react';
import { Eraser, AlertTriangle, Layout, Users, ShieldAlert, RotateCcw, ShieldX, UserMinus } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

interface AdminMaintenanceProps {
  currentUser: any;
}

const AdminMaintenance: React.FC<AdminMaintenanceProps> = ({ currentUser }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFullWipe = async () => {
    if(confirm('سيتم مسح كافة البيانات (المستخدمين، الغرف، المحادثات، الحقائب)؟ هذه العملية لا يمكن التراجع عنها.')) {
      setIsProcessing(true); 
      try {
        const batch = writeBatch(db);
        (await getDocs(collection(db, 'users'))).forEach(d => { if (d.id !== currentUser.id) batch.delete(d.ref); });
        (await getDocs(collection(db, 'rooms'))).forEach(d => batch.delete(d.ref));
        (await getDocs(collection(db, 'private_chats'))).forEach(d => batch.delete(d.ref));
        (await getDocs(collection(db, 'lucky_bags'))).forEach(d => batch.delete(d.ref));
        await batch.commit(); 
        alert('تم تطهير قاعدة البيانات بالكامل ✅'); 
        window.location.reload();
      } catch(e) { 
        console.error(e);
        alert('فشل العملية'); 
      } finally { 
        setIsProcessing(false); 
      }
    }
  };

  const handleSecurityPurge = async () => {
    if (!confirm('هل تريد حذف رتبة "مدير" من كافة الحسابات المسجلة الآن؟ ستصبح أنت المدير الوحيد للنظام.')) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const usersSnap = await getDocs(collection(db, 'users'));
      let count = 0;
      usersSnap.forEach(uDoc => {
        if (uDoc.id !== currentUser.id && uDoc.data().isAdmin === true) {
          batch.update(uDoc.ref, { isAdmin: false });
          count++;
        }
      });
      await batch.commit();
      alert(`تم سحب صلاحيات الإدارة من ${count} حساب بنجاح ✅`);
    } catch (e) {
      alert('فشل عملية التطهير الأمني');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    if(confirm('هل أنت متأكد من حذف جميع حسابات المستخدمين نهائياً؟ سيتم الإبقاء على حسابك فقط.')) {
      setIsProcessing(true);
      try {
        const batch = writeBatch(db);
        const usersSnap = await getDocs(collection(db, 'users'));
        let count = 0;
        usersSnap.forEach(d => {
          if (d.id !== currentUser.id) {
            batch.delete(d.ref);
            count++;
          }
        });
        await batch.commit();
        alert(`تم حذف ${count} حساب مستخدم بنجاح ✅`);
      } catch (e) {
        alert('فشل حذف الحسابات');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClearRooms = async () => {
    if(confirm('حذف كافة الغرف النشطة الآن؟')) {
      setIsProcessing(true); 
      try {
        const batch = writeBatch(db); 
        (await getDocs(collection(db, 'rooms'))).forEach(d => batch.delete(d.ref));
        await batch.commit(); 
        alert('تم تنظيف قائمة الغرف ✅');
      } catch(e) { 
        alert('فشل تنظيف الغرف'); 
      } finally { 
        setIsProcessing(false); 
      }
    }
  };

  const handleResetDailyPoints = async () => {
    if(!confirm('هل تريد تصفير الكاريزما والثروة لجميع الأعضاء (التصفير اليومي)؟')) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(uDoc => {
        batch.update(uDoc.ref, { charm: 0, wealth: 0 });
      });
      await batch.commit();
      alert('تم التصفير اليومي لجميع الأعضاء بنجاح ✅');
    } catch (e) {
      alert('فشلت عملية التصفير');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-right font-cairo" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-600/20 rounded-2xl">
          <Eraser className="text-red-500" size={28} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">مركز صيانة النظام</h3>
          <p className="text-slate-500 text-xs font-bold mt-1">تطهير الإدارة وتنظيف البيانات الحساسة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* تطهير أمني */}
        <div className="bg-indigo-600/5 border border-indigo-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-indigo-600/10 transition-all">
          <ShieldX size={32} className="text-indigo-500" />
          <h4 className="text-white font-black text-sm">التطهير الأمني للأدمن</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">سحب رتبة الإدارة من جميع الحسابات (إبقاء حسابك فقط).</p>
          <button 
            onClick={handleSecurityPurge} 
            disabled={isProcessing} 
            className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            تطهير الآن
          </button>
        </div>

        {/* تصفير يومي */}
        <div className="bg-amber-600/5 border border-amber-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-amber-600/10 transition-all">
          <RotateCcw size={32} className="text-amber-500" />
          <h4 className="text-white font-black text-sm">التطةير اليومي</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">تصفير نقاط الكاريزما والثروة لجميع الأعضاء فوراً.</p>
          <button 
            onClick={handleResetDailyPoints} 
            disabled={isProcessing} 
            className="w-full py-3 bg-amber-600 text-black font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            تصفير الآن
          </button>
        </div>

        {/* حذف المستخدمين */}
        <div className="bg-orange-600/5 border border-orange-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-orange-600/10 transition-all">
          <UserMinus size={32} className="text-orange-500" />
          <h4 className="text-white font-black text-sm">حذف كافة المستخدمين</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">مسح جميع الحسابات لتبدأ قاعدة بيانات نظيفة.</p>
          <button 
            onClick={handleDeleteAllUsers} 
            disabled={isProcessing} 
            className="w-full py-3 bg-orange-600 text-white font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            حذف الجميع
          </button>
        </div>

        {/* مسح شامل */}
        <div className="bg-red-600/5 border border-red-600/20 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 shadow-xl hover:bg-red-600/10 transition-all">
          <AlertTriangle size={32} className="text-red-600" />
          <h4 className="text-white font-black text-sm">مسح شامل للبيانات</h4>
          <p className="text-[10px] text-slate-500 leading-relaxed">حذف كل شيء (مستخدمين، غرف، شات) باستثنائك.</p>
          <button 
            onClick={handleFullWipe} 
            disabled={isProcessing} 
            className="w-full py-3 bg-red-600 text-white font-black rounded-xl text-xs shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
          >
            تطهير شامل
          </button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2rem] flex items-start gap-4">
        <ShieldAlert className="text-amber-500 shrink-0" size={20} />
        <div className="text-right">
          <h5 className="text-amber-500 font-black text-xs mb-1">تنبيه أمني هام</h5>
          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            عند الضغط على "تطهير الآن" في قسم الأدمن، ستصبح أنت المتحكم الوحيد بريدياً وبرمجياً في LiveTalk. تأكد من تسجيل حسابك ببريد admin-official@livetalk.com أولاً.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminMaintenance;
