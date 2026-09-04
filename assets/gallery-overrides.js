(()=>{
  const D=window.ANOTHER_HOUSE_DATA;
  if(!D?.galleryCategories)return;

  const originalCommon=D.galleryCategories.find(category=>category.id==='common')?.items||[];
  const originalSingle=D.galleryCategories.find(category=>category.id==='single')?.items||[];
  const originalDouble=D.galleryCategories.find(category=>category.id==='double')?.items||[];
  const removedCommon=new Set([3,5,7,9,14,16,21,23,25,34]);
  const range=(start,end)=>originalCommon.filter((_,index)=>index+1>=start&&index+1<=end&&!removedCommon.has(index+1));
  const byNumber=(items,numbers)=>numbers.map(number=>items[number-1]).filter(Boolean);

  const exterior=range(1,16);
  const lounge=byNumber(originalCommon,[22,20,18,17,19,24,26]);
  const bath=byNumber(originalCommon,[30,29,31,28,32,33,27,35,36]);
  const doubleRooms=byNumber(originalDouble,[4,9,1,8]);
  const luggage=range(37,37);

  D.galleryCategories=[
    {id:'exterior',label:{ko:'전경',en:'Exterior',ja:'外観',zh:'外景', "zh-TW":"外景"},items:exterior},
    {id:'lounge',label:{ko:'라운지',en:'Lounge',ja:'ラウンジ',zh:'休息区', "zh-TW":"休息區"},items:lounge},
    {id:'bath',label:{ko:'샤워실 & 파우더룸',en:'Shower & powder',ja:'シャワー＆パウダールーム',zh:'淋浴间与化妆间', "zh-TW":"淋浴間與化妝間"},items:bath},
    {id:'single',label:{ko:'1인실',en:'Single rooms',ja:'1人部屋',zh:'单人房', "zh-TW":"單人房"},items:originalSingle},
    {id:'double',label:{ko:'2인실',en:'Double rooms',ja:'2人部屋',zh:'双人房', "zh-TW":"雙人房"},items:doubleRooms},
    {id:'luggage',label:{ko:'러기지룸',en:'Luggage room',ja:'荷物室',zh:'行李房', "zh-TW":"行李房"},items:luggage}
  ];

  D.gallery=exterior;
  D.homeGallery=byNumber(originalCommon,[22,15]).concat(byNumber(originalDouble,[9]));

  D.pages.checkin.roomDoorlockImage='/assets/images/checkin-room-doorlock.jpg';
  D.pages.checkin.roomDoorlockLabel={ko:'객실 도어락',en:'Room door lock',ja:'客室ドアロック',zh:'客房门锁', "zh-TW":"客房門鎖"};
  D.luggage.value={ko:'503호 앞 러기지 룸',en:'Luggage room in front of Room 503',ja:'503号室前の荷物室',zh:'503号房前的行李房', "zh-TW":"503號房前的行李房"};
  D.luggage.image='/assets/images/gallery/another-house/common-37-luggage.webp';
})();
