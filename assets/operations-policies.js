(function(root,factory){const data=factory();if(typeof module==='object'&&module.exports)module.exports=data;if(root)root.ANOTHER_HOUSE_OPERATIONS=data;})(typeof window!=='undefined'?window:null,function(){
  // Operator confirmation, 2026-11-25. Public policy only; no guest credentials.
  return {
    version:'2026-11-25.1',
    source:{sheet:'어나더 요약',confirmedAt:'2026-11-25',items:[21,44,45]},
    messageSchedule:{
      channels:['Booking.com','Trip.com','Agoda','Airbnb'],
      events:['reservation-confirmed','7-days-before','3-days-before','1-day-before','checkin-day'],
      sameDayBooking:'reservation-confirmed',identicalContent:true,fixedClockTime:null,
      answer:{
        ko:'체크인 안내는 예약한 사이트(부킹닷컴·트립닷컴·아고다·에어비앤비)의 메시지로 보내드립니다. 동일한 내용을 예약 확정 시, 입실 7일 전, 3일 전, 1일 전, 입실 당일 총 5회 발송합니다. 당일 예약은 예약 확정 시 안내 메시지를 발송합니다.',
        en:'Check-in instructions are sent through the site you booked with: Booking.com, Trip.com, Agoda or Airbnb. The same instructions are sent five times: when the reservation is confirmed, 7 days before check-in, 3 days before, 1 day before and on the check-in day. For a same-day booking, the instructions are sent when the reservation is confirmed.',
        ja:'チェックイン案内は、ご予約のサイト（Booking.com・Trip.com・Agoda・Airbnb）のメッセージでお送りします。同じ内容を予約確定時、チェックイン7日前、3日前、1日前、当日の計5回送信します。当日予約の場合は予約確定時に案内を送信します。',
        zh:'入住指南通过您预订的网站（Booking.com、Trip.com、Agoda或Airbnb）消息发送。相同内容共发送5次：预订确认时、入住前7天、前3天、前1天及入住当天。当天预订会在预订确认时发送指南。',
        'zh-TW':'入住指南透過您訂房的網站（Booking.com、Trip.com、Agoda或Airbnb）訊息傳送。相同內容共傳送5次：訂房確認時、入住前7天、前3天、前1天及入住當天。當天訂房會在訂房確認時傳送指南。'
      },
      clockUnknown:{
        ko:'정확한 발송 시각(몇 시)은 현재 안내된 내용에 없습니다.',
        en:'An exact clock time for sending the messages has not been specified in the current instructions.',
        ja:'送信する正確な時刻（何時か）は、現在の案内には記載されていません。',
        zh:'目前的指南没有注明具体几点发送。',
        'zh-TW':'目前的指南沒有註明具體幾點傳送。'
      }
    },
    roomDining:{allowed:true,lightMeals:true,answer:{
      ko:'객실에서 음식·간식·음료를 드실 수 있습니다. 객실에서는 간단한 취식 위주로 이용해주세요. 라운지 테이블도 이용할 수 있습니다.',
      en:'Food, snacks and drinks are allowed in your room, mainly for light meals and refreshments. You may also use the lounge tables.',
      ja:'客室内で飲食できます。お食事・お菓子・お飲み物は、簡単な飲食を中心にご利用ください。ラウンジのテーブルも利用できます。',
      zh:'客房内可以吃东西、零食及饮用饮料，请以简单用餐为主。也可以使用休息区的餐桌。',
      'zh-TW':'客房內可以吃東西、零食及飲用飲料，請以簡單用餐為主。也可以使用休息區的餐桌。'
    }},
    foodDelivery:{allowed:true,selfPickup:true,pickupFloor:1,pickupLocation:'outside-entrance',bringIntoRoom:true,answer:{
      ko:'배달음식을 주문하실 수 있습니다. 1층 출입문 밖에서 직접 수령한 뒤 객실로 가져가 주세요. 객실에서는 간단한 취식 위주로 이용해주세요.',
      en:'You may order food delivery. Receive it yourself outside the entrance on the ground floor (1F), then bring it to your room. Please keep in-room dining to light meals and refreshments.',
      ja:'料理のデリバリーを注文できます。1階の入口の外でご自身で受け取り、客室へお持ちください。客室では簡単な飲食を中心にご利用ください。',
      zh:'可以订外卖。请在1楼出入口门外亲自领取，再带入客房。客房内请以简单用餐为主。',
      'zh-TW':'可以訂外送。請在1樓出入口門外親自領取，再帶回客房。客房內請以簡單用餐為主。'
    }},
    earlyArrival:{
      ko:'얼리 체크인은 제공되지 않으며 체크인은 오후 3시부터 가능합니다. 먼저 도착하시면 체크인 당일 503호 앞 짐보관실을 이용하실 수 있습니다.',
      en:'Early check-in is not available; check-in starts at 15:00. If you arrive earlier, you may use the luggage storage room in front of Room 503 on your check-in day.',
      ja:'アーリーチェックインはご利用いただけず、チェックインは15:00からです。早く到着した場合は、チェックイン当日に503号室前の荷物保管室を利用できます。',
      zh:'不提供提前入住，入住从15:00开始。如果提早到达，可在入住当天使用503号房前的行李保管室。',
      'zh-TW':'不提供提早入住，入住從15:00開始。如果提早抵達，可在入住當天使用503號房前的行李保管室。'
    }
  };
});
