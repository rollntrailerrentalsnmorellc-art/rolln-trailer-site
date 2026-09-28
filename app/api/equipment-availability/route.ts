import {NextRequest,NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {equipment} from '@/lib/equipment';
import {parseEquipmentDate,validEquipmentDates} from '@/lib/equipment-dates';

export async function GET(request:NextRequest) {
  const itemId=request.nextUrl.searchParams.get('itemId')||'';
  const pickup=parseEquipmentDate(request.nextUrl.searchParams.get('pickup')||'');
  const returnAt=parseEquipmentDate(request.nextUrl.searchParams.get('returnAt')||'');
  if (!equipment.some(item=>item.id===itemId) || !validEquipmentDates(pickup,returnAt)) return NextResponse.json({error:'Choose valid future dates within 30 days.'},{status:400});
  try {
    const admin=createAdminClient();
    const {data:inventory,error:inventoryError}=await admin.from('equipment_inventory').select('status').eq('id',itemId).single();
    if (inventoryError || !inventory) return NextResponse.json({available:null});
    if (inventory.status!=='available') return NextResponse.json({available:false});
    const {data:conflicts,error}=await admin.from('equipment_requests').select('id').eq('equipment_id',itemId)
      .in('status',['held','active']).lt('pickup_at',returnAt!.toISOString()).gt('return_at',pickup!.toISOString()).limit(1);
    if (error) return NextResponse.json({available:null});
    return NextResponse.json({available:!conflicts?.length});
  } catch {return NextResponse.json({available:null});}
}
