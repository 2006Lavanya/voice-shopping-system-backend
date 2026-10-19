/**
 * moreProducts.js
 * ---------------
 * ADDITIVE catalogue expansion. Adds the categories that were missing (Grocery, Toys,
 * Mobile Accessories, Computers, Home & Kitchen, Beauty & Personal Care, Sports) and more
 * products for Electronics, Fashion and Books. Nothing in baseData.js / extraProducts.js is changed.
 *
 * Every product gets: unique image, name, description, price (MRP + selling price), category,
 * stock and rating. Tags include Tamil / Tanglish words (arisi, paal, ennai ...) so text and voice
 * search work in English, Tamil and Tanglish.
 *
 * Row format:
 *   "Category|Brand|Name|MRP|Price|tags|description|Spec=Value;Spec=Value|flags|icon"
 *   flags: featured, best  (comma separated, optional)
 */
import { productImage } from "./imageGen.js";

export const moreCategories = [
  { name: "Grocery", slug: "grocery", image: "" },
  { name: "Home & Kitchen", slug: "home-kitchen", image: "" },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", image: "" },
  { name: "Sports", slug: "sports", image: "" },
  { name: "Toys", slug: "toys", image: "" },
  { name: "Mobile Accessories", slug: "mobile-accessories", image: "" },
  { name: "Computers", slug: "computers", image: "" },
];

const ROWS = [
  // ------------------------------------------------------------------ GROCERY
  "Grocery|Tata Sampann|Tata Sampann Unpolished Toor Dal 1kg|220|189|dal,toor dal,paruppu,pulses,grocery,thuvaram paruppu|Protein-rich unpolished toor dal, naturally cooked in minutes for sambar and dal fry.|Weight=1kg;Type=Toor Dal|best|grocery",
  "Grocery|India Gate|India Gate Basmati Rice Classic 5kg|650|549|rice,arisi,basmati,grocery,biryani rice|Aged long-grain basmati rice with rich aroma - perfect for biryani and pulao.|Weight=5kg;Grain=Long|featured,best|grocery",
  "Grocery|Aashirvaad|Aashirvaad Whole Wheat Atta 5kg|295|264|atta,wheat flour,godhumai maavu,flour,chapati,grocery|100% whole wheat atta for soft, fluffy rotis every day.|Weight=5kg|best|grocery",
  "Grocery|Fortune|Fortune Sunlite Refined Sunflower Oil 1L|165|149|oil,ennai,sunflower oil,cooking oil,grocery|Light, healthy refined sunflower oil for everyday cooking.|Volume=1L|best|bottle",
  "Grocery|Idhayam|Idhayam Gingelly Oil 1L|380|340|oil,gingelly oil,nallennai,sesame oil,ennai,grocery|Traditional cold-pressed sesame (gingelly) oil, a South Indian kitchen staple.|Volume=1L|featured|bottle",
  "Grocery|Tata Tea|Tata Tea Gold 500g|285|255|tea,chai,tea powder,theneer,grocery|Rich blend of Assam leaves with long leaves for a strong, aromatic cup.|Weight=500g|best|jar",
  "Grocery|Bru|Bru Instant Coffee 200g|520|468|coffee,kaapi,instant coffee,grocery|Smooth, aromatic instant coffee blended with chicory.|Weight=200g|best|jar",
  "Grocery|Amul|Amul Taaza Toned Milk 1L|78|74|milk,paal,dairy,amul,grocery|Fresh homogenised toned milk, rich in calcium and protein.|Volume=1L;Fat=3%|best|bottle",
  "Grocery|Amul|Amul Pasteurised Butter 500g|285|272|butter,dairy,vennai,amul,grocery|Creamy, salted table butter - ideal for toast, parathas and cooking.|Weight=500g||jar",
  "Grocery|Britannia|Britannia Good Day Cashew Cookies 600g|120|105|biscuit,cookies,britannia,snacks,grocery|Buttery cookies loaded with crunchy cashew bits.|Weight=600g||grocery",
  "Grocery|Maggi|Maggi 2-Minute Masala Noodles 12-Pack|180|168|noodles,maggi,instant noodles,snacks,grocery|India's favourite masala noodles, ready in two minutes.|Pack=12 x 70g|best|grocery",
  "Grocery|Madhur|Madhur Pure Sugar 5kg|265|239|sugar,sakkarai,chini,grocery|Pure white refined sugar crystals, free-flowing and hygienically packed.|Weight=5kg||grocery",
  "Grocery|Tata Salt|Tata Salt Vacuum Evaporated Iodised 1kg|28|26|salt,uppu,iodised salt,grocery|Vacuum-evaporated iodised salt for everyday cooking.|Weight=1kg||jar",
  "Grocery|Kissan|Kissan Fresh Tomato Ketchup 950g|175|149|ketchup,sauce,tomato sauce,grocery|Rich tomato ketchup made from real tomatoes, no added colour.|Weight=950g||bottle",
  "Grocery|Dabur|Dabur Honey 500g|260|229|honey,thean,dabur,grocery|100% pure honey with no added sugar - a natural sweetener.|Weight=500g|featured|jar",
  "Grocery|MTR|MTR Sambar Powder 200g|98|89|sambar,sambar powder,masala,podi,spices,grocery|Authentic South Indian sambar masala for restaurant-style sambar at home.|Weight=200g||jar",

  // ---------------------------------------------------------- HOME & KITCHEN
  "Home & Kitchen|Pigeon|Pigeon Non-Stick Cookware Set 3 Piece|2995|1799|cookware,non stick,kadai,tawa,pan,kitchen,home|Induction-base non-stick set: fry pan, tawa and kadai with cool-touch handles.|Pieces=3;Base=Induction|best|pot",
  "Home & Kitchen|Hawkins|Hawkins Contura Pressure Cooker 3L|2250|1795|pressure cooker,cooker,kitchen,home,hard anodised|Hard-anodised, long-lasting pressure cooker with heat-resistant handles.|Capacity=3L|featured,best|pot",
  "Home & Kitchen|Borosil|Borosil Glass Lunch Box 3 Piece|1299|899|lunch box,tiffin,glass,container,kitchen,home|Microwave-safe borosilicate glass containers with air-tight lids.|Pieces=3||jar",
  "Home & Kitchen|Prestige|Prestige PIC 20 Induction Cooktop 2000W|3295|2299|induction,cooktop,stove,kitchen,home|2000W induction cooktop with 8 preset Indian menus.|Power=2000W|best|appliance",
  "Home & Kitchen|Cello|Cello Water Bottle Set 6 Piece|599|449|water bottle,bottles,set,kitchen,home|Leak-proof food-grade plastic bottles, ideal for fridge and travel.|Pieces=6|| bottle",
  "Home & Kitchen|Bombay Dyeing|Bombay Dyeing Double Cotton Bedsheet with 2 Pillow Covers|1799|899|bedsheet,bed sheet,cotton,home,bedding|Soft, colour-fast 144 TC cotton double bedsheet with two pillow covers.|Size=Double;Thread=144TC||box",
  "Home & Kitchen|Wonderchef|Wonderchef Nutri-Blend 400W Mixer|3999|2499|blender,nutri blend,mixer,smoothie,kitchen,home|Compact 400W blender for smoothies, shakes and chutneys.|Power=400W;Jars=2||appliance",
  "Home & Kitchen|Bajaj|Bajaj Majesty DX-6 Dry Iron|1099|749|iron,dry iron,box,clothes,home|1000W dry iron with non-stick soleplate and 3-year warranty.|Power=1000W||appliance",
  "Home & Kitchen|Philips|Philips 9W LED Bulb Pack of 4|699|449|led bulb,bulb,light,lamp,home|Energy-saving 9W cool daylight LED bulbs, 4-pack.|Power=9W;Pack=4||box",
  "Home & Kitchen|Kent|Kent Electric Kettle 1.8L|1999|1299|kettle,electric kettle,hot water,kitchen,home|Stainless-steel 1.8L electric kettle with auto shut-off.|Capacity=1.8L||appliance",
  "Home & Kitchen|Sleepwell|Sleepwell Memory Foam Pillow|1499|699|pillow,thalagani,memory foam,bedding,home|Ergonomic memory-foam pillow for neck and spine support.|Type=Memory Foam||box",
  "Home & Kitchen|Godrej|Godrej Aer Twist Car & Room Freshener|349|279|freshener,air freshener,room,fragrance,home|Long-lasting fragrance gel for car and small rooms.|Fragrance=Fresh Lush||jar",
  "Home & Kitchen|Zebra|Zebra Stainless Steel Knife Set 6 Piece|899|599|knife,knife set,kitchen,cutlery,home|Razor-sharp stainless-steel knives with ergonomic grips.|Pieces=6||box",

  // ------------------------------------------------- BEAUTY & PERSONAL CARE
  "Beauty & Personal Care|Dove|Dove Intense Repair Body Lotion 400ml|499|399|body lotion,lotion,moisturizer,skin care,personal care|Deep-nourishing body lotion for dry skin, 48-hour moisture.|Volume=400ml|best|tube",
  "Beauty & Personal Care|Himalaya|Himalaya Purifying Neem Face Wash 150ml|190|159|face wash,neem,facewash,skin care,personal care|Soap-free neem and turmeric face wash for clear skin.|Volume=150ml|best|tube",
  "Beauty & Personal Care|Nivea Men|Nivea Men Fresh Active Deodorant 150ml|299|219|deodorant,deo,perfume,men,personal care|48-hour freshness men's deodorant spray.|Volume=150ml||bottle",
  "Beauty & Personal Care|Gillette|Gillette Fusion 5 Razor with 2 Blades|849|699|razor,shaving,gillette,men,personal care|5-blade precision razor for a smooth, close shave.|Blades=5||brush",
  "Beauty & Personal Care|Syska|Syska HD1600 Hair Dryer 1600W|1299|749|hair dryer,dryer,hair,personal care|1600W dryer with cool shot and 2 speed settings.|Power=1600W||appliance",
  "Beauty & Personal Care|WOW Skin Science|WOW Onion Black Seed Hair Oil 200ml|599|449|hair oil,onion oil,ennai,hair care,personal care|Reduces hair fall with onion and black seed oil blend.|Volume=200ml|best|bottle",
  "Beauty & Personal Care|Pantene|Pantene Hair Fall Control Shampoo 650ml|620|499|shampoo,hair care,pantene,personal care|Strengthens hair roots to reduce hair fall.|Volume=650ml||bottle",
  "Beauty & Personal Care|Maybelline|Maybelline Colossal Kajal 0.35g|249|199|kajal,eyeliner,makeup,maybelline,beauty|Smudge-proof, intense black kajal that lasts 24 hours.|Type=Kajal||lipstick",
  "Beauty & Personal Care|Colgate|Colgate MaxFresh Toothpaste 150g Pack of 4|480|389|toothpaste,colgate,oral care,paste,personal care|Cooling crystals for long-lasting fresh breath.|Pack=4 x 150g||tube",
  "Beauty & Personal Care|Lotus Herbals|Lotus Safe Sun SPF 50 Sunscreen 100g|599|479|sunscreen,sun screen,spf,skin care,personal care|Broad-spectrum SPF 50 PA+++ non-greasy sunscreen.|SPF=50||tube",
  "Beauty & Personal Care|Dettol|Dettol Original Soap 125g Pack of 5|290|229|soap,sopu,dettol,bath,personal care|Antibacterial bathing soap that protects from 100 illness-causing germs.|Pack=5||box",
  "Beauty & Personal Care|Forest Essentials|Forest Essentials Facial Ubtan Cleanser 100ml|1350|1215|ubtan,cleanser,face,skin care,beauty|Ayurvedic ubtan cleanser with turmeric and saffron.|Volume=100ml|featured|tube",

  // ------------------------------------------------------------------ SPORTS
  "Sports|Yonex|Yonex Astrox 3 DG Badminton Racquet|3490|2650|badminton,racquet,racket,sports,yonex|Isometric head, durable graphite frame for power and control.|Weight=88g|featured,best|racquet",
  "Sports|Cosco|Cosco Premier Football Size 5|899|699|football,soccer,ball,pandhu,sports|Machine-stitched PU football for training and match play.|Size=5|best|ball",
  "Sports|SG|SG RSD Spark Kashmir Willow Cricket Bat|2299|1799|cricket,bat,cricket bat,sports|Light-weight Kashmir willow bat for tennis and leather ball.|Size=Full;Wood=Kashmir Willow||racquet",
  "Sports|Nivia|Nivia Dominator Basketball Size 7|1299|949|basketball,ball,pandhu,sports|Rubber basketball with deep channels for superior grip.|Size=7||ball",
  "Sports|Decathlon|Decathlon 6mm Non-Slip Yoga Mat|1499|999|yoga mat,mat,yoga,fitness,sports|6mm cushioned non-slip mat for yoga and floor exercises.|Thickness=6mm|best|box",
  "Sports|Boldfit|Boldfit Adjustable Dumbbell Set 10kg|2499|1599|dumbbell,weights,gym,fitness,sports|Rubber-coated adjustable dumbbells for home workouts.|Weight=10kg|best|dumbbell",
  "Sports|Strauss|Strauss Adjustable Skipping Rope|349|199|skipping rope,rope,jump rope,fitness,sports|Tangle-free speed rope with foam handles.|Length=9ft||dumbbell",
  "Sports|Boldfit|Boldfit Resistance Bands Set of 5|999|499|resistance band,bands,gym,fitness,sports|5 resistance levels for strength, stretching and rehab.|Pieces=5||dumbbell",
  "Sports|Vector X|Vector X Cricket Batting Gloves|899|649|cricket,gloves,batting gloves,sports|Padded batting gloves with breathable cotton palm.|Size=Men||bag",
  "Sports|SS|SS Cricket Leather Ball Pack of 6|1499|1099|cricket ball,leather ball,cricket,sports|Four-piece leather cricket balls for practice.|Pack=6||ball",
  "Sports|Yonex|Yonex Mavis 350 Nylon Shuttlecock 6 Pack|899|749|shuttlecock,badminton,shuttle,sports|Durable nylon shuttlecocks with consistent flight.|Pack=6||racquet",
  "Sports|Speedo|Speedo Biofuse Swimming Goggles|1299|899|swimming,goggles,swim,sports|Anti-fog, UV-protected goggles with adjustable nose bridge.|Lens=Anti-fog||camera",
  "Sports|Hero|Hero Sprint 26T Mountain Bicycle|9500|7999|cycle,bicycle,bike,sports|26-inch mountain bicycle with front suspension.|Wheel=26T;Gears=Single||ball",
  "Sports|Adidas|Adidas Classic Gym Duffle Bag|2299|1599|gym bag,duffle,bag,sports|Roomy duffle with shoe compartment and padded straps.|Capacity=35L||bag",

  // -------------------------------------------------------------------- TOYS
  "Toys|LEGO|LEGO Classic Large Creative Brick Box 790 Pieces|4999|4299|lego,blocks,bricks,toys,kids,vilayattu|790 colourful bricks to spark creativity, ages 4+.|Pieces=790;Age=4+|featured,best|toy",
  "Toys|Hot Wheels|Hot Wheels 20 Car Gift Pack|1799|1399|hot wheels,cars,toy cars,toys,kids|Pack of 20 die-cast 1:64 scale cars.|Pieces=20;Age=3+|best|car",
  "Toys|Funskool|Funskool Monopoly Classic Board Game|1299|999|monopoly,board game,game,toys,family|The classic property trading game for 2-6 players.|Players=2-6;Age=8+||toy",
  "Toys|Barbie|Barbie Fashionista Doll with Accessories|899|699|barbie,doll,bommai,toys,girls|Fashion doll with stylish outfit and accessories.|Age=3+||teddy",
  "Toys|Nerf|Nerf Elite 2.0 Eaglepoint Blaster|2199|1799|nerf,blaster,gun,toys,kids|Blaster with 8-dart clip and detachable scope.|Age=8+||toy",
  "Toys|Fisher-Price|Fisher-Price Baby's First Rattle Set|699|499|rattle,baby toy,toys,infant|Easy-grasp rattles in assorted colours for babies 3m+.|Age=3m+||teddy",
  "Toys|Toyzone|Toyzone Remote Control Racing Car|1499|899|remote car,rc car,car,toys,kids|Rechargeable 2.4GHz RC racing car with headlights.|Range=30m||car",
  "Toys|Rubik's|Rubik's Cube 3x3 Speed Cube|599|449|rubik,rubiks cube,cube,puzzle,toys|Original 3x3 cube with smooth turning.|Age=8+||toy",
  "Toys|Play-Doh|Play-Doh Modeling Compound 10 Pack|799|599|play doh,clay,dough,toys,kids|Ten non-toxic colourful dough cans.|Pieces=10;Age=3+||jar",
  "Toys|Ravensburger|Ravensburger Jigsaw Puzzle 1000 Pieces|1999|1599|puzzle,jigsaw,toys,family|Premium 1000-piece puzzle with a perfect fit.|Pieces=1000||book",
  "Toys|Archies|Archies Soft Teddy Bear 3 Feet|1899|999|teddy,teddy bear,soft toy,bommai,toys,gift|Plush 3-feet teddy bear, a perfect gift.|Height=3ft|featured,best|teddy",
  "Toys|Funskool|Funskool Scrabble Word Game|1199|899|scrabble,word game,board game,toys|Classic crossword game for 2-4 players.|Players=2-4||toy",
  "Toys|Mattel|Mattel UNO Playing Cards|299|199|uno,cards,card game,toys,family|The classic card game of matching colours and numbers.|Players=2-10|best|book",
  "Toys|Kidzo|Kidzo Learning Tablet for Kids|1499|899|learning tablet,kids tablet,education,toys|Colourful tablet with alphabets, numbers and rhymes.|Age=3+||phone",

  // ------------------------------------------------------- MOBILE ACCESSORIES
  "Mobile Accessories|Anker|Anker 65W GaN Fast Charger|4999|3299|charger,gan,fast charger,laptop charger,mobile accessories|Compact 3-port GaN charger for phone and laptop.|Power=65W;Ports=3|best|charger",
  "Mobile Accessories|boAt|boAt Deuce USB 300 Type-C Cable 1.5m|499|249|cable,type c,usb cable,charging cable,mobile accessories|Tangle-free braided cable with 3A fast charging.|Length=1.5m|best|cable",
  "Mobile Accessories|Redmi|Redmi 20000mAh Power Bank 18W|2499|1799|power bank,powerbank,charger,battery,mobile accessories|Dual-output 20000mAh power bank with 18W fast charge.|Capacity=20000mAh||charger",
  "Mobile Accessories|Ambrane|Ambrane 15W Wireless Charging Pad|1499|799|wireless charger,charging pad,mobile accessories|Qi wireless charging pad with LED indicator.|Power=15W||charger",
  "Mobile Accessories|Zebronics|Zebronics Adjustable Mobile Stand|499|299|phone stand,mobile stand,holder,mobile accessories|Foldable aluminium stand for phone and tablet.|Material=Aluminium||case",
  "Mobile Accessories|Samsung|Samsung 25W Super Fast Charger|1699|1299|charger,samsung charger,fast charger,mobile accessories|Original 25W USB-C adapter for Galaxy phones.|Power=25W||charger",
  "Mobile Accessories|Ringke|Ringke Tempered Glass Screen Protector 2 Pack|999|599|screen guard,tempered glass,screen protector,mobile accessories|9H hardness tempered glass, easy installation tray.|Pack=2||case",
  "Mobile Accessories|PopSockets|PopSockets PopGrip Phone Grip|899|649|pop socket,phone grip,grip,mobile accessories|Expanding grip and stand for any phone.|Type=Grip||case",
  "Mobile Accessories|Baseus|Baseus 3-in-1 Charging Cable 1.2m|899|549|cable,3 in 1 cable,usb cable,mobile accessories|Lightning, Type-C and Micro-USB in one cable.|Length=1.2m||cable",
  "Mobile Accessories|Joyroom|Joyroom Car Mobile Holder Magnetic|799|499|car holder,mobile holder,car mount,mobile accessories|Strong magnetic dashboard mount with 360 rotation.|Type=Magnetic||case",
  "Mobile Accessories|Portronics|Portronics Selfie Stick Tripod with Remote|1299|699|selfie stick,tripod,mobile accessories|Extendable Bluetooth selfie stick with tripod legs.|Length=1m||camera",
  "Mobile Accessories|Samsung|Samsung Galaxy S25 Silicone Cover|2499|1799|case,cover,samsung cover,mobile cover,mobile accessories|Soft-touch silicone cover with microfibre lining.|Fit=Galaxy S25||case",

  // --------------------------------------------------------------- COMPUTERS
  "Computers|Logitech|Logitech MX Master 3S Wireless Mouse|10995|8495|mouse,wireless mouse,logitech,computer,computers|Quiet clicks, 8K DPI sensor, USB-C fast charge.|DPI=8000;Battery=70 days|featured|mouse",
  "Computers|Logitech|Logitech K380 Bluetooth Keyboard|3495|2495|keyboard,bluetooth keyboard,logitech,computers|Slim multi-device Bluetooth keyboard.|Connect=Bluetooth|best|keyboard",
  "Computers|Dell|Dell S2421HN 24-inch Full HD Monitor|13999|10499|monitor,screen,dell,display,computers|24-inch IPS FHD monitor with 75Hz and HDMI.|Size=24in;Panel=IPS|featured|monitor",
  "Computers|Samsung|Samsung 980 500GB NVMe SSD|6499|3999|ssd,nvme,storage,samsung,computers|Fast PCIe 3.0 NVMe SSD up to 3100 MB/s.|Capacity=500GB|best|drive",
  "Computers|Seagate|Seagate Backup Plus 2TB Portable Hard Drive|7499|5499|hard disk,hdd,external hard drive,storage,computers|2TB USB 3.0 portable drive with backup software.|Capacity=2TB||drive",
  "Computers|SanDisk|SanDisk Ultra Flair 128GB USB 3.0 Pen Drive|1599|899|pen drive,pendrive,usb drive,flash drive,computers|Up to 150MB/s transfer speed.|Capacity=128GB|best|drive",
  "Computers|TP-Link|TP-Link Archer AX23 Wi-Fi 6 Router|4499|2999|router,wifi router,wifi,tp link,computers|AX1800 dual-band Wi-Fi 6 router.|Speed=1800Mbps||router",
  "Computers|Epson|Epson EcoTank L3250 Wi-Fi Printer|13999|12499|printer,epson,ink tank,scanner,computers|Print, scan and copy with ultra-low cost ink tank.|Type=All-in-One||drive",
  "Computers|Portronics|Portronics My Buddy Laptop Table|1999|1099|laptop table,laptop stand,table,computers|Foldable laptop table with cup holder.|Material=Wood||box",
  "Computers|Logitech|Logitech C270 HD Webcam|2995|1995|webcam,camera,video call,computers|HD 720p webcam with built-in mic.|Resolution=720p||camera",
  "Computers|Redragon|Redragon K552 Kumara Mechanical Keyboard|4499|2999|mechanical keyboard,keyboard,gaming keyboard,computers|Compact TKL mechanical keyboard with RGB.|Switch=Blue|best|keyboard",
  "Computers|Kingston|Kingston Fury 16GB DDR4 3200MHz RAM|4499|3299|ram,memory,ddr4,kingston,computers|Plug-and-play DDR4 memory for desktops.|Capacity=16GB||drive",
  "Computers|Targus|Targus 15.6-inch Laptop Backpack|3499|1799|laptop bag,backpack,bag,computers|Water-resistant padded laptop backpack.|Fit=15.6in||bag",
  "Computers|APC|APC Back-UPS 600VA UPS|3999|3199|ups,power backup,apc,computers|Battery backup for desktop PC and router.|Capacity=600VA||appliance",

  // ------------------------------------------------- MORE ELECTRONICS
  "Electronics|Amazon|Amazon Echo Dot 5th Gen Smart Speaker|5499|4499|echo dot,alexa,smart speaker,speaker,electronics|Smart speaker with Alexa and improved bass.|Gen=5th|featured|speaker",
  "Electronics|Realme|Realme Buds T300 True Wireless Earbuds|2999|2299|earbuds,tws,realme buds,earphones,electronics|30dB ANC, 40 hours battery, 12.4mm driver.|ANC=30dB|best|headphones",
  "Electronics|TCL|TCL 43-inch 4K Ultra HD Smart Google TV|31990|21990|tv,smart tv,43 inch,4k tv,electronics|4K HDR Google TV with Dolby Audio.|Size=43in;Resolution=4K||tv",
  "Electronics|Sony|Sony HT-S20R 5.1ch Dolby Digital Soundbar|24990|17990|soundbar,home theatre,speaker,sony,electronics|5.1ch surround soundbar with wired rear speakers.|Power=400W||speaker",
  "Electronics|Canon|Canon EOS 1500D DSLR Camera with 18-55mm Lens|45995|37990|dslr,camera,canon,photography,electronics|24.1MP DSLR with Wi-Fi and 18-55mm kit lens.|Sensor=24.1MP||camera",
  "Electronics|GoPro|GoPro HERO12 Black Action Camera|45000|34990|gopro,action camera,camera,electronics|5.3K video, HyperSmooth 6.0 and waterproof to 10m.|Video=5.3K|featured|camera",
  "Electronics|Noise|Noise Buds VS104 Truewireless Earbuds|2999|999|earbuds,noise buds,tws,earphones,electronics|Up to 45 hours playtime with Instacharge.|Battery=45h|best|headphones",
  "Electronics|JBL|JBL Tune 760NC Wireless Headphones|7999|4999|headphones,jbl,noise cancelling,wireless,electronics|Active noise cancelling with up to 50 hours battery.|Battery=50h||headphones",
  "Electronics|boAt|boAt Airdopes 141 TWS Earbuds|4490|1099|earbuds,airdopes,boat,tws,electronics|42 hours playback, ENx noise reduction.|Battery=42h|best|headphones",

  "Books|Penguin|The Alchemist (Paulo Coelho) Special Edition|399|299|book,alchemist,novel,fiction,books|A shepherd's journey to find his personal legend.|Pages=208|best|book",
  "Books|Manjul|Think and Grow Rich by Napoleon Hill|399|249|book,think and grow rich,self help,books|Timeless principles of success and wealth.|Pages=238||book",
  "Books|Thirumagal|Thirukkural with Tamil and English Meaning|450|350|book,thirukkural,tamil book,pudhagam,thiruvalluvar,books|Complete 1330 couplets with Tamil and English explanations.|Language=Tamil+English|featured|book",
  "Books|Westland|The Immortals of Meluha by Amish|350|249|book,shiva trilogy,amish,fiction,novel,books|First book of the Shiva Trilogy set in ancient India.|Pages=412||book",
  "Books|Tamil Nadu Textbook|Kalvi Tamil Grammar Guide for Students|220|180|book,tamil grammar,ilakkanam,study,tamil book,books|Easy Tamil grammar guide with exercises.|Language=Tamil||book",
  "Home & Kitchen|Tupperware|Tupperware Airtight Storage Container Set 5 Piece|1799|1199|container,storage box,kitchen,home|Airtight, stackable containers for grains and snacks.|Pieces=5||jar",
  "Electronics|Philips|Philips 1000 Series Hair Straightener Trimmer|1999|1399|trimmer,grooming,electronics|Multi-purpose grooming kit with 11 attachments.|Pieces=11||brush",
  "Mobile Accessories|ESR|ESR MagSafe Wireless Charging Case iPhone 15|2999|1999|case,cover,iphone 15 case,mobile cover,mobile accessories|Magnetic case with strong MagSafe alignment.|Fit=iPhone 15||case",
  "Mobile Accessories|Apple|Apple MagSafe Charger 15W|4500|3999|charger,magsafe,wireless charger,apple charger,mobile accessories|Fast wireless charging for iPhone 12 and later.|Power=15W||charger",
  // ---------------------------------------------------------- MORE FASHION
  "Fashion|Levi's|Levi's 511 Slim Fit Jeans for Men|3999|2599|jeans,pant,levis,men,fashion|Slim-fit stretch denim jeans in indigo.|Fit=Slim|best|shirt",
  "Fashion|Roadster|Roadster Men Cotton Round Neck T-Shirt|899|499|tshirt,t shirt,tee,men,fashion,cotton|Soft pure cotton tee with a relaxed fit.|Material=Cotton|best|shirt",
  "Fashion|Biba|Biba Women Printed Anarkali Kurta|2299|1399|kurta,kurti,anarkali,women,fashion,ethnic|Flowy cotton anarkali kurta with floral print.|Material=Cotton||shirt",
  "Fashion|Raymond|Raymond Men Formal Trousers|2499|1799|trousers,pant,formal,men,fashion|Wrinkle-resistant poly-viscose formal trousers.|Fit=Regular||shirt",
  "Fashion|Puma|Puma Men Essentials Hoodie|3499|1999|hoodie,sweatshirt,puma,men,fashion|Cosy fleece hoodie with kangaroo pocket.|Material=Fleece||shirt",
  "Fashion|Jockey|Jockey Men Cotton Brief Pack of 3|699|549|innerwear,brief,jockey,men,fashion|Soft stretch cotton briefs with concealed waistband.|Pack=3||shirt",
  "Fashion|Peter England|Peter England Men Slim Fit Blazer|7999|3999|blazer,coat,formal,men,fashion|Slim-fit single-breasted blazer for office and events.|Fit=Slim||shirt",
  "Fashion|W|W Women Printed Palazzo Pants|1299|799|palazzo,pant,women,fashion,ethnic|Comfortable printed palazzo in breathable fabric.|Material=Rayon||shirt",
  "Fashion|Wildcraft|Wildcraft Urban Backpack 25L|1999|1299|backpack,bag,school bag,college bag,fashion|Water-resistant backpack with laptop sleeve.|Capacity=25L|best|bag",
  "Fashion|Fabindia|Fabindia Women Cotton Saree|2999|1999|saree,cotton saree,women,fashion,ethnic|Handloom cotton saree with woven border.|Material=Cotton||shirt",

  // ----------------------------------------------------------- MORE BOOKS
  "Books|Penguin|Ikigai: The Japanese Secret to a Long and Happy Life|499|329|book,ikigai,self help,books|Find your purpose with the Japanese concept of ikigai.|Pages=208||book",
  "Books|Sandhya|Ponniyin Selvan by Kalki (Tamil, 5 Volumes)|1500|1199|book,ponniyin selvan,kalki,tamil book,pudhagam,books|Kalki's epic Tamil historical novel in five volumes.|Language=Tamil;Volumes=5|featured|book",
];

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const SIZES = { Fashion: ["S", "M", "L", "XL"] };

export const buildMoreProducts = () =>
  ROWS.map((row) => {
    const [category, brand, name, mrp, price, tags, description, specs, flags = "", icon = ""] = row.split("|").map((s) => s.trim());
    const h = hash(name);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const p = {
      name,
      brand,
      category,
      price: Number(mrp),
      discountPrice: Number(price) < Number(mrp) ? Number(price) : null,
      images: [productImage({ name, brand, category, icon })],
      stock: h % 17 === 0 ? 0 : 8 + (h % 190), // a few items are genuinely out of stock so the stock badge is demonstrable
      rating: Math.round((3.8 + ((h >>> 3) % 100) / 100) * 10) / 10,
      reviewCount: 25 + (h % 2400),
      tags: tagList,
      description,
      specifications: Object.fromEntries((specs || "").split(";").filter(Boolean).map((kv) => kv.split("="))),
      featured: flags.includes("featured"),
      bestSeller: flags.includes("best"),
    };
    if (SIZES[category]) p.sizes = SIZES[category];
    return p;
  });
