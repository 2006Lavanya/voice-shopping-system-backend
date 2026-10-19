/**
 * extraProducts.js
 * ----------------
 * A large catalog with realistic Indian prices (₹). `mrp` is the list/launch price and
 * `price` is the typical selling price - the app shows the discount automatically.
 *
 * IMPORTANT: real prices change every week. These are close to market rates at the time of
 * writing - edit them any time from the Admin panel (Admin > Products) or in this file and
 * re-run `npm run seed`.
 *
 * Row format:  "Category | Brand | Name | MRP | Price | tags,comma,separated | description | Spec=Value;Spec=Value | flags"
 * flags (optional): featured, best
 */
import { img } from "./baseData.js";

export const extraCategories = [
  { name: "Tablets", slug: "tablets", image: "" },
  { name: "Gaming", slug: "gaming", image: "" },
  { name: "Kitchen", slug: "kitchen", image: "" },
  { name: "Sports & Fitness", slug: "sports-fitness", image: "" },
  { name: "Books", slug: "books", image: "" },
];

const ROWS = [
  // ------------------------------------------------------------------ MOBILES
  "Mobiles|Apple|iPhone 16 (128GB)|79900|72900|smartphone,apple,iphone,ios|Apple iPhone 16 with A18 chip, Camera Control button and all-day battery.|Storage=128GB;Display=6.1-inch Super Retina XDR;Chip=A18|featured,best",
  "Mobiles|Apple|iPhone 16 Pro (256GB)|119900|114900|smartphone,apple,iphone,ios,pro|iPhone 16 Pro with titanium design, A18 Pro chip and 48MP Fusion camera.|Storage=256GB;Display=6.3-inch ProMotion;Chip=A18 Pro|featured",
  "Mobiles|Apple|iPhone 16 Pro Max (256GB)|144900|139900|smartphone,apple,iphone,ios,pro max|Biggest iPhone display ever with 5x telephoto camera and class-leading battery life.|Storage=256GB;Display=6.9-inch ProMotion;Chip=A18 Pro|featured",
  "Mobiles|Apple|iPhone 16e (128GB)|59900|56900|smartphone,apple,iphone,ios|iPhone 16e brings A18 chip, Apple Intelligence and a 48MP camera at a lower price.|Storage=128GB;Display=6.1-inch OLED;Chip=A18|",
  "Mobiles|Apple|iPhone 13 (128GB)|59900|44990|smartphone,apple,iphone,ios|iPhone 13 with A15 Bionic chip and dual 12MP cameras - still great value.|Storage=128GB;Display=6.1-inch Super Retina XDR|best",
  "Mobiles|Samsung|Galaxy S25 Ultra 5G (256GB)|129999|119999|smartphone,samsung,galaxy,ultra,android|Galaxy S25 Ultra with Snapdragon 8 Elite, S Pen and 200MP camera.|RAM=12GB;Storage=256GB;Display=6.9-inch Dynamic AMOLED 2X|featured",
  "Mobiles|Samsung|Galaxy S25 5G (128GB)|80999|74999|smartphone,samsung,galaxy,android|Compact Galaxy S25 with Galaxy AI, Snapdragon 8 Elite and bright AMOLED display.|RAM=12GB;Storage=128GB;Display=6.2-inch Dynamic AMOLED 2X|",
  "Mobiles|Samsung|Galaxy S24 5G (256GB)|79999|58999|smartphone,samsung,galaxy,android|Galaxy S24 with Exynos 2400, Galaxy AI features and 50MP triple camera.|RAM=8GB;Storage=256GB;Display=6.2-inch Dynamic AMOLED 2X|best",
  "Mobiles|Samsung|Galaxy A55 5G (8GB/128GB)|39999|29999|smartphone,samsung,galaxy,android,midrange|Galaxy A55 with metal frame, Super AMOLED 120Hz display and 50MP OIS camera.|RAM=8GB;Storage=128GB;Display=6.6-inch Super AMOLED|",
  "Mobiles|Samsung|Galaxy M35 5G (6GB/128GB)|24999|17499|smartphone,samsung,galaxy,android,budget|Galaxy M35 with 6000mAh battery and 120Hz Super AMOLED display.|RAM=6GB;Storage=128GB;Battery=6000mAh|best",
  "Mobiles|Samsung|Galaxy Z Flip6 5G (256GB)|109999|89999|smartphone,samsung,galaxy,foldable,flip|Pocket-sized foldable with Flex Window and Galaxy AI.|RAM=12GB;Storage=256GB;Display=6.7-inch foldable AMOLED|",
  "Mobiles|OnePlus|OnePlus 13 5G (12GB/256GB)|69999|66999|smartphone,oneplus,android,flagship|OnePlus 13 with Snapdragon 8 Elite, Hasselblad camera and 6000mAh battery.|RAM=12GB;Storage=256GB;Battery=6000mAh|featured",
  "Mobiles|OnePlus|OnePlus 13R 5G (12GB/256GB)|42999|39999|smartphone,oneplus,android|OnePlus 13R with Snapdragon 8 Gen 3 and 80W fast charging.|RAM=12GB;Storage=256GB;Battery=6000mAh|best",
  "Mobiles|OnePlus|OnePlus Nord CE4 Lite 5G (8GB/128GB)|19999|16999|smartphone,oneplus,android,budget|Nord CE4 Lite with 5500mAh battery and 80W SuperVOOC charging.|RAM=8GB;Storage=128GB|",
  "Mobiles|Google|Pixel 9 (12GB/256GB)|79999|72999|smartphone,google,pixel,android|Google Pixel 9 with Tensor G4 and the best point-and-shoot camera.|RAM=12GB;Storage=256GB;Display=6.3-inch Actua OLED|",
  "Mobiles|Google|Pixel 9a (8GB/128GB)|49999|46999|smartphone,google,pixel,android|Pixel 9a with Tensor G4, 7 years of updates and great camera.|RAM=8GB;Storage=128GB|",
  "Mobiles|Nothing|Nothing Phone (3a) (8GB/128GB)|24999|23999|smartphone,nothing,phone,android|Nothing Phone (3a) with Glyph interface, 50MP triple camera and clean Nothing OS.|RAM=8GB;Storage=128GB|best",
  "Mobiles|Nothing|Nothing Phone (3a) Pro (8GB/256GB)|29999|27999|smartphone,nothing,phone,android|Nothing Phone (3a) Pro with periscope telephoto camera and 120Hz AMOLED.|RAM=8GB;Storage=256GB|",
  "Mobiles|Redmi|Redmi Note 14 Pro+ 5G (8GB/256GB)|29999|26999|smartphone,redmi,xiaomi,android|Redmi Note 14 Pro+ with 200MP camera, curved AMOLED and 120W charging.|RAM=8GB;Storage=256GB;Battery=5110mAh|best",
  "Mobiles|Redmi|Redmi 13 5G (6GB/128GB)|15999|12999|smartphone,redmi,xiaomi,android,budget|Redmi 13 5G with 108MP camera and 6.79-inch 120Hz display.|RAM=6GB;Storage=128GB|",
  "Mobiles|POCO|POCO X7 Pro 5G (8GB/256GB)|27999|24999|smartphone,poco,xiaomi,android,gaming|POCO X7 Pro with Dimensity 8400 Ultra and 6550mAh battery.|RAM=8GB;Storage=256GB|",
  "Mobiles|Realme|Realme 14 Pro+ 5G (8GB/256GB)|29999|26999|smartphone,realme,android|Realme 14 Pro+ with cold-sensing design and 3x periscope camera.|RAM=8GB;Storage=256GB|",
  "Mobiles|Realme|Realme Narzo 70 Pro 5G (8GB/128GB)|19999|17999|smartphone,realme,narzo,android|Narzo 70 Pro with Sony IMX890 OIS camera and 120Hz AMOLED.|RAM=8GB;Storage=128GB|",
  "Mobiles|Vivo|Vivo T3x 5G (6GB/128GB)|15999|12999|smartphone,vivo,android,budget|Vivo T3x 5G with 6000mAh battery and Snapdragon 6 Gen 1.|RAM=6GB;Storage=128GB|",
  "Mobiles|iQOO|iQOO Neo 10R 5G (8GB/128GB)|26999|24999|smartphone,iqoo,android,gaming|iQOO Neo 10R with Snapdragon 8s Gen 3 for smooth gaming.|RAM=8GB;Storage=128GB|",
  "Mobiles|Motorola|Moto G85 5G (8GB/128GB)|22999|17999|smartphone,motorola,moto,android|Moto G85 with curved pOLED display and 50MP OIS camera.|RAM=8GB;Storage=128GB|",
  "Mobiles|Oppo|Oppo Reno 13 5G (8GB/256GB)|37999|34999|smartphone,oppo,android|Oppo Reno 13 5G with AI portrait camera and slim design.|RAM=8GB;Storage=256GB|",

  // ------------------------------------------------------------------ LAPTOPS
  "Laptops|Apple|MacBook Air 13-inch M4 (16GB/256GB)|99900|94900|laptop,apple,macbook,ultrabook|MacBook Air with the M4 chip - fanless, 18-hour battery and Liquid Retina display.|Chip=Apple M4;RAM=16GB;Storage=256GB SSD|featured,best",
  "Laptops|Apple|MacBook Air 15-inch M4 (16GB/256GB)|124900|114990|laptop,apple,macbook,ultrabook|Big-screen MacBook Air with M4 chip and six-speaker sound system.|Chip=Apple M4;RAM=16GB;Storage=256GB SSD|",
  "Laptops|Apple|MacBook Pro 14-inch M4 (16GB/512GB)|169900|159900|laptop,apple,macbook,pro|MacBook Pro 14 with M4 chip, XDR display and up to 24 hours battery.|Chip=Apple M4;RAM=16GB;Storage=512GB SSD|featured",
  "Laptops|Dell|Dell Inspiron 15 3530 (i5 13th Gen, 16GB/512GB)|62990|52990|laptop,dell,inspiron,office|Dell Inspiron 15 with 13th Gen Core i5 and FHD 120Hz display.|CPU=Intel Core i5-1334U;RAM=16GB;Storage=512GB SSD|",
  "Laptops|HP|HP 15s (i5 12th Gen, 16GB/512GB)|59999|48990|laptop,hp,student,office|HP 15s thin and light laptop with micro-edge FHD display.|CPU=Intel Core i5-1235U;RAM=16GB;Storage=512GB SSD|best",
  "Laptops|HP|HP Pavilion Plus 14 (Ryzen 7, 16GB/512GB)|89999|79990|laptop,hp,pavilion,oled|HP Pavilion Plus 14 with 2.8K OLED display and Ryzen 7.|CPU=Ryzen 7 7840U;RAM=16GB;Storage=512GB SSD|",
  "Laptops|HP|HP Omen 16 (Ryzen 7, RTX 4060)|139999|119990|laptop,hp,omen,gaming|HP Omen 16 gaming laptop with RTX 4060 and 165Hz display.|CPU=Ryzen 7 8845HS;GPU=RTX 4060;RAM=16GB|",
  "Laptops|Lenovo|Lenovo IdeaPad Slim 5 (Ryzen 7, 16GB/512GB)|79990|64990|laptop,lenovo,ideapad,slim|IdeaPad Slim 5 with metal body, Ryzen 7 and 16-inch WUXGA display.|CPU=Ryzen 7 7730U;RAM=16GB;Storage=512GB SSD|",
  "Laptops|Lenovo|Lenovo LOQ 15 (i5, RTX 4050)|94990|74990|laptop,lenovo,loq,gaming|Lenovo LOQ 15 gaming laptop with RTX 4050 and 144Hz display.|CPU=Intel Core i5-13450HX;GPU=RTX 4050;RAM=16GB|best",
  "Laptops|Lenovo|Lenovo Legion 5 (Ryzen 7, RTX 4060)|139990|109990|laptop,lenovo,legion,gaming|Legion 5 with RTX 4060, 165Hz display and advanced cooling.|CPU=Ryzen 7 7745HX;GPU=RTX 4060;RAM=16GB|",
  "Laptops|Lenovo|Lenovo ThinkPad E14 (i5 13th Gen, 16GB/512GB)|86000|69990|laptop,lenovo,thinkpad,business|ThinkPad E14 business laptop with legendary keyboard and security.|CPU=Intel Core i5-1335U;RAM=16GB;Storage=512GB SSD|",
  "Laptops|ASUS|ASUS Vivobook 15 (i3 13th Gen, 8GB/512GB)|52990|38990|laptop,asus,vivobook,budget,student|ASUS Vivobook 15 - reliable everyday laptop with FHD display.|CPU=Intel Core i3-1315U;RAM=8GB;Storage=512GB SSD|best",
  "Laptops|ASUS|ASUS Vivobook S 14 OLED (Core Ultra 5)|99990|84990|laptop,asus,vivobook,oled,ultrabook|Vivobook S 14 with 3K OLED display and Intel Core Ultra processor.|CPU=Core Ultra 5 125H;RAM=16GB;Storage=512GB SSD|",
  "Laptops|ASUS|ASUS ROG Strix G16 (i7, RTX 4060)|169990|139990|laptop,asus,rog,gaming|ROG Strix G16 with RTX 4060, 165Hz display and RGB keyboard.|CPU=Intel Core i7-13650HX;GPU=RTX 4060;RAM=16GB|",
  "Laptops|ASUS|ASUS Zenbook 14 OLED (Core Ultra 7)|109990|89990|laptop,asus,zenbook,oled,ultrabook|Zenbook 14 OLED - 1.2kg ultrabook with 2.8K OLED screen.|CPU=Core Ultra 7 155H;RAM=16GB;Storage=1TB SSD|",
  "Laptops|Acer|Acer Nitro V 15 (i5, RTX 4050)|89999|72990|laptop,acer,nitro,gaming|Acer Nitro V 15 gaming laptop with RTX 4050 and 144Hz FHD display.|CPU=Intel Core i5-13420H;GPU=RTX 4050;RAM=16GB|",
  "Laptops|Acer|Acer Aspire Lite 14 (Ryzen 5, 16GB/512GB)|42999|31990|laptop,acer,aspire,budget,student|Acer Aspire Lite thin and light laptop for study and office work.|CPU=Ryzen 5 5625U;RAM=16GB;Storage=512GB SSD|",
  "Laptops|MSI|MSI Thin 15 (i5, RTX 4050)|74990|56990|laptop,msi,gaming,thin|MSI Thin 15 gaming laptop with RTX 4050 and 144Hz display.|CPU=Intel Core i5-12450H;GPU=RTX 4050;RAM=16GB|",
  "Laptops|Samsung|Samsung Galaxy Book4 (i5, 16GB/512GB)|75990|54990|laptop,samsung,galaxy book|Galaxy Book4 slim laptop with AMOLED display.|CPU=Intel Core i5-1335U;RAM=16GB;Storage=512GB SSD|",

  // ------------------------------------------------------------------ TABLETS
  "Tablets|Apple|iPad 11th Gen (128GB, Wi-Fi)|34900|33900|tablet,apple,ipad,ios|iPad with A16 chip and 10.9-inch Liquid Retina display.|Storage=128GB;Display=10.9-inch;Chip=A16|best",
  "Tablets|Apple|iPad Air 11-inch M3 (128GB, Wi-Fi)|59900|54900|tablet,apple,ipad,air|iPad Air with M3 chip, perfect for creative work and study.|Storage=128GB;Display=11-inch;Chip=M3|featured",
  "Tablets|Apple|iPad Pro 11-inch M4 (256GB, Wi-Fi)|99900|94900|tablet,apple,ipad,pro|iPad Pro with M4 chip and tandem OLED display.|Storage=256GB;Display=11-inch OLED;Chip=M4|",
  "Tablets|Apple|iPad mini 7 (128GB, Wi-Fi)|49900|46900|tablet,apple,ipad,mini|Compact iPad mini with A17 Pro and Apple Pencil Pro support.|Storage=128GB;Display=8.3-inch|",
  "Tablets|Samsung|Samsung Galaxy Tab S9 FE 5G (8GB/128GB)|44999|29999|tablet,samsung,galaxy,android|Galaxy Tab S9 FE with S Pen in the box and IP68 water resistance.|RAM=8GB;Storage=128GB;Display=10.9-inch|best",
  "Tablets|Samsung|Samsung Galaxy Tab A9+ (4GB/64GB)|20999|15999|tablet,samsung,galaxy,budget|Galaxy Tab A9+ with 11-inch 90Hz display for entertainment.|RAM=4GB;Storage=64GB;Display=11-inch|",
  "Tablets|Xiaomi|Xiaomi Pad 6 (8GB/256GB)|26999|21999|tablet,xiaomi,mi,android|Xiaomi Pad 6 with 11-inch 144Hz 2.8K display and Snapdragon 870.|RAM=8GB;Storage=256GB|",
  "Tablets|OnePlus|OnePlus Pad 2 (8GB/128GB)|39999|34999|tablet,oneplus,android|OnePlus Pad 2 with Snapdragon 8 Gen 3 and 12.1-inch 144Hz display.|RAM=8GB;Storage=128GB|",
  "Tablets|Lenovo|Lenovo Tab M11 (4GB/128GB)|19999|14999|tablet,lenovo,budget,android|Lenovo Tab M11 with 11-inch display and quad speakers.|RAM=4GB;Storage=128GB|",

  // ------------------------------------------------------------------ ELECTRONICS: AUDIO
  "Electronics|Sony|Sony WF-1000XM5 Earbuds|24990|19990|earbuds,sony,audio,anc|Sony WF-1000XM5 with industry-leading noise cancellation.|Type=In-ear;Battery=8 hours (24 with case)|featured",
  "Electronics|Sony|Sony WH-CH720N Headphones|14990|8990|headphones,sony,audio,anc|Lightweight wireless noise cancelling headphones with 35 hours battery.|Type=Over-ear;Battery=35 hours|best",
  "Electronics|Bose|Bose QuietComfort Ultra Headphones|42900|34900|headphones,bose,audio,anc,premium|Bose QC Ultra with immersive audio and world-class noise cancellation.|Type=Over-ear;Battery=24 hours|",
  "Electronics|Apple|Apple AirPods 4 with ANC|17900|16900|earbuds,apple,airpods,anc|AirPods 4 with Active Noise Cancellation and USB-C case.|Type=In-ear;Battery=5 hours|",
  "Electronics|Apple|Apple AirPods Max (USB-C)|59900|54900|headphones,apple,airpods,premium|AirPods Max with computational audio and spatial sound.|Type=Over-ear;Battery=20 hours|",
  "Electronics|Samsung|Samsung Galaxy Buds3 Pro|19999|17999|earbuds,samsung,galaxy,anc|Galaxy Buds3 Pro with blade design and intelligent ANC.|Type=In-ear;Battery=6 hours|",
  "Electronics|OnePlus|OnePlus Buds 3|5499|4499|earbuds,oneplus,audio,anc|OnePlus Buds 3 with 49dB ANC and dual drivers.|Type=In-ear;Battery=10 hours|best",
  "Electronics|Nothing|Nothing Ear (3)|17999|15999|earbuds,nothing,audio,anc|Nothing Ear with transparent design and great sound.|Type=In-ear;Battery=10 hours|",
  "Electronics|boAt|boAt Rockerz 255 Pro+ Neckband|3990|1299|neckband,boat,audio,budget|boAt Rockerz 255 Pro+ with 60 hours playback and ASAP charge.|Type=Neckband;Battery=60 hours|best",
  "Electronics|boAt|boAt Airdopes Alpha Earbuds|3990|1199|earbuds,boat,audio,budget|boAt Airdopes Alpha with 35 hours playtime and ENx tech.|Type=In-ear;Battery=35 hours|best",
  "Electronics|JBL|JBL Tune 770NC Headphones|9999|5999|headphones,jbl,audio,anc|JBL Tune 770NC wireless headphones with adaptive noise cancelling.|Type=Over-ear;Battery=70 hours|",
  "Electronics|JBL|JBL Charge 5 Bluetooth Speaker|19999|12999|speaker,jbl,bluetooth,waterproof|JBL Charge 5 with powerful sound and built-in power bank.|Battery=20 hours;Waterproof=IP67|featured",
  "Electronics|JBL|JBL Go 4 Mini Speaker|3999|2999|speaker,jbl,bluetooth,portable|Ultra-portable JBL Go 4 with punchy bass.|Battery=7 hours;Waterproof=IP67|",
  "Electronics|Sony|Sony SRS-XB100 Speaker|4990|3790|speaker,sony,bluetooth,portable|Compact Sony speaker with IP67 rating and 16 hours playback.|Battery=16 hours;Waterproof=IP67|",
  "Electronics|Amazon|Amazon Echo Dot (5th Gen) Smart Speaker|5499|4999|speaker,amazon,alexa,smart home|Echo Dot 5th Gen with Alexa and improved bass.|Assistant=Alexa|",
  "Electronics|Amazon|Amazon Fire TV Stick 4K|5999|4999|streaming,amazon,fire tv,tv stick|Fire TV Stick 4K for streaming with Alexa Voice Remote.|Resolution=4K Ultra HD|best",

  // ------------------------------------------------------------------ ELECTRONICS: TV / CAMERA / PC
  "Electronics|LG|LG 43 inch 4K UHD Smart LED TV (UR75)|54990|29990|tv,lg,4k,smart tv|LG 43-inch 4K Smart TV with webOS and AI Sound.|Size=43-inch;Resolution=4K UHD|best",
  "Electronics|Samsung|Samsung 43 inch Crystal 4K Vision Pro TV|51900|31990|tv,samsung,4k,smart tv|Samsung Crystal 4K Smart TV with Tizen OS.|Size=43-inch;Resolution=4K UHD|",
  "Electronics|Sony|Sony Bravia 55 inch 4K Google TV|99900|64990|tv,sony,4k,smart tv,google tv|Sony Bravia 55-inch 4K HDR with Google TV and Dolby Audio.|Size=55-inch;Resolution=4K UHD|featured",
  "Electronics|Xiaomi|Xiaomi Smart TV X 43 inch 4K|36999|26999|tv,xiaomi,mi,4k,smart tv|Xiaomi X series 4K Google TV with Dolby Vision.|Size=43-inch;Resolution=4K UHD|",
  "Electronics|Redmi|Redmi Smart Fire TV 43 inch Full HD|26999|21999|tv,redmi,xiaomi,smart tv,fire tv|Redmi Fire TV with Alexa voice remote.|Size=43-inch;Resolution=Full HD|",
  "Electronics|TCL|TCL 55 inch 4K QLED Google TV|79990|36990|tv,tcl,qled,4k,smart tv|TCL 55-inch QLED 4K Google TV with Dolby Vision.|Size=55-inch;Resolution=4K QLED|",
  "Electronics|Canon|Canon EOS R50 Mirrorless Camera (18-45mm Kit)|82995|74990|camera,canon,mirrorless,vlog|Canon EOS R50 compact mirrorless camera for creators.|Sensor=24.2MP APS-C;Video=4K|",
  "Electronics|Sony|Sony ZV-E10 II Vlog Camera (16-50mm Kit)|89990|84990|camera,sony,vlog,mirrorless|Sony ZV-E10 II vlogging camera with 4K video.|Sensor=26MP APS-C;Video=4K 60p|",
  "Electronics|GoPro|GoPro HERO13 Black Action Camera|47500|38990|camera,gopro,action camera|GoPro HERO13 Black with 5.3K video and HyperSmooth stabilization.|Video=5.3K60|",
  "Electronics|DJI|DJI Osmo Pocket 3 Creator Combo|59900|52900|camera,dji,vlog,gimbal|DJI Osmo Pocket 3 with 1-inch sensor and 3-axis gimbal.|Sensor=1-inch CMOS;Video=4K 120fps|",
  "Electronics|Fujifilm|Fujifilm Instax Mini 12 Instant Camera|7999|5999|camera,fujifilm,instax,instant|Instax Mini 12 instant camera with auto exposure.|Film=Instax Mini|",
  "Electronics|LG|LG UltraGear 27 inch QHD 180Hz Gaming Monitor|24999|16999|monitor,lg,gaming,qhd|LG UltraGear 27-inch QHD IPS 180Hz monitor with 1ms response.|Size=27-inch;Refresh=180Hz|",
  "Electronics|Samsung|Samsung Odyssey G3 24 inch 165Hz Monitor|17999|11999|monitor,samsung,gaming|Samsung Odyssey G3 24-inch FHD 165Hz gaming monitor.|Size=24-inch;Refresh=165Hz|",
  "Electronics|Logitech|Logitech MX Keys S Wireless Keyboard|11995|9495|keyboard,logitech,wireless|Logitech MX Keys S smart backlit wireless keyboard.|Connectivity=Bluetooth/Bolt|",
  "Electronics|Logitech|Logitech K380 Multi-Device Keyboard|2995|2295|keyboard,logitech,wireless,compact|Compact Bluetooth keyboard that pairs with 3 devices.|Connectivity=Bluetooth|",
  "Electronics|Logitech|Logitech G102 Gaming Mouse|1995|1295|mouse,logitech,gaming|Logitech G102 Lightsync RGB gaming mouse.|DPI=8000|",
  "Electronics|Logitech|Logitech C920 HD Pro Webcam|7495|5495|webcam,logitech,video|Logitech C920 Full HD 1080p webcam.|Resolution=1080p|",
  "Electronics|HP|HP Wireless Mouse 220|1099|699|mouse,hp,wireless|HP wireless mouse with 18 months battery life.|Connectivity=2.4GHz|",
  "Electronics|Epson|Epson EcoTank L3250 Wi-Fi Ink Tank Printer|16999|14499|printer,epson,wifi,inktank|Epson EcoTank L3250 all-in-one printer with very low cost per page.|Type=Print/Scan/Copy;Connectivity=Wi-Fi|",
  "Electronics|TP-Link|TP-Link Archer C6 AC1200 Wi-Fi Router|3999|2699|router,tp-link,wifi,networking|TP-Link Archer C6 dual-band Wi-Fi router.|Speed=1200Mbps|",
  "Electronics|SanDisk|SanDisk Extreme Portable SSD 1TB|12999|8499|ssd,sandisk,storage,portable|SanDisk Extreme Portable SSD with 1050MB/s read speed.|Capacity=1TB|best",
  "Electronics|Samsung|Samsung T7 Shield Portable SSD 1TB|14999|9999|ssd,samsung,storage,portable|Rugged Samsung T7 Shield SSD with IP65 rating.|Capacity=1TB|",
  "Electronics|Seagate|Seagate One Touch 2TB External HDD|7499|5799|hdd,seagate,storage,portable|Seagate One Touch 2TB portable hard drive.|Capacity=2TB|",
  "Electronics|SanDisk|SanDisk Ultra 128GB microSD Card|1599|1049|memory card,sandisk,microsd,storage|SanDisk Ultra 128GB microSDXC card with 140MB/s speed.|Capacity=128GB|",
  "Electronics|Kingston|Kingston DataTraveler 64GB Pen Drive|749|499|pendrive,kingston,storage,usb|Kingston 64GB USB 3.2 pen drive.|Capacity=64GB|",
  "Electronics|TP-Link|TP-Link Tapo C200 Pan/Tilt Security Camera|2999|1799|camera,tp-link,cctv,security,smart home|Tapo C200 1080p Wi-Fi home security camera.|Resolution=1080p|best",
  "Electronics|Wipro|Wipro Smart Wi-Fi LED Bulb 12W|999|549|bulb,wipro,smart home,led|Wipro 12W colour smart bulb works with Alexa and Google Assistant.|Power=12W|",

  // ------------------------------------------------------------------ GAMING
  "Gaming|Sony|PlayStation 5 Slim (Disc Edition)|54990|49990|console,playstation,ps5,sony,gaming|PS5 Slim with 1TB SSD, 4K gaming and DualSense controller.|Storage=1TB;Resolution=4K|featured",
  "Gaming|Microsoft|Xbox Series S 512GB|34990|32990|console,xbox,microsoft,gaming|Xbox Series S - next-gen all-digital console.|Storage=512GB|",
  "Gaming|Nintendo|Nintendo Switch OLED Model|34999|31999|console,nintendo,switch,gaming|Nintendo Switch OLED with vibrant 7-inch screen.|Display=7-inch OLED|",
  "Gaming|Sony|Sony DualSense Wireless Controller|6390|5090|controller,playstation,ps5,sony,gaming|DualSense controller with haptic feedback and adaptive triggers.|Connectivity=Bluetooth|",
  "Gaming|Microsoft|Xbox Wireless Controller|5990|4799|controller,xbox,microsoft,gaming|Xbox Wireless Controller for Xbox, PC and mobile.|Connectivity=Bluetooth|",
  "Gaming|HyperX|HyperX Cloud II Gaming Headset|9990|6990|headset,hyperx,gaming,headphones|HyperX Cloud II with 7.1 virtual surround sound.|Type=Over-ear wired|",
  "Gaming|Razer|Razer DeathAdder Essential Gaming Mouse|2999|1499|mouse,razer,gaming|Razer DeathAdder Essential ergonomic gaming mouse.|DPI=6400|",
  "Gaming|Sony|God of War Ragnarok (PS5)|3999|1999|game,playstation,ps5,sony,gaming|God of War Ragnarok action-adventure game for PlayStation 5.|Platform=PS5|",
  "Gaming|EA|EA Sports FC 25 (PS5)|4499|2999|game,playstation,ps5,football,gaming|EA Sports FC 25 football game for PlayStation 5.|Platform=PS5|",

  // ------------------------------------------------------------------ FASHION
  "Fashion|Levi's|Levi's Men 511 Slim Fit Jeans|3999|2799|jeans,levis,men,denim|Levi's 511 slim fit stretch jeans.|Fit=Slim;Material=Cotton Stretch|best",
  "Fashion|Levi's|Levi's Men 501 Original Fit Jeans|4499|3149|jeans,levis,men,denim|Iconic Levi's 501 straight fit jeans.|Fit=Straight;Material=Denim|",
  "Fashion|US Polo Assn.|U.S. Polo Assn. Men Polo T-Shirt|1999|1099|tshirt,polo,men,us polo|Classic pique polo T-shirt.|Material=Cotton|best",
  "Fashion|Puma|Puma Men Regular Fit T-Shirt|1299|649|tshirt,puma,men,sports|Puma cotton logo T-shirt.|Material=Cotton|",
  "Fashion|Nike|Nike Dri-FIT Men Training T-Shirt|2495|1745|tshirt,nike,men,sports|Nike Dri-FIT sweat-wicking training tee.|Material=Polyester|",
  "Fashion|Adidas|Adidas Men Essentials Track Pants|2999|1799|trackpants,adidas,men,sports|Adidas track pants with tapered fit.|Material=Cotton blend|",
  "Fashion|Peter England|Peter England Men Formal Shirt|1799|899|shirt,formal,men,peter england|Peter England slim fit formal shirt.|Material=Cotton|",
  "Fashion|Van Heusen|Van Heusen Men Slim Fit Formal Shirt|2199|1199|shirt,formal,men,van heusen|Van Heusen wrinkle-resistant formal shirt.|Material=Cotton blend|",
  "Fashion|Raymond|Raymond Men Slim Fit Blazer|9999|5999|blazer,formal,men,raymond|Raymond slim fit blazer for formal occasions.|Material=Polyester wool blend|",
  "Fashion|Roadster|Roadster Men Hooded Sweatshirt|1499|749|hoodie,sweatshirt,men,roadster|Roadster fleece hoodie for cool weather.|Material=Cotton fleece|",
  "Fashion|Jockey|Jockey Men Vest (Pack of 2)|699|549|innerwear,vest,men,jockey|Jockey cotton vests, pack of 2.|Material=Cotton|",
  "Fashion|Fabindia|Fabindia Men Cotton Kurta|2290|1590|kurta,men,ethnic,fabindia|Fabindia handloom cotton kurta.|Material=Cotton|",
  "Fashion|W|W Women Printed Straight Kurta|1999|1199|kurta,kurti,women,ethnic|W straight-fit printed kurta.|Material=Cotton|best",
  "Fashion|Libas|Libas Women Kurta Set with Dupatta|2999|1499|kurta,kurti,women,ethnic,set|Libas embroidered kurta, pant and dupatta set.|Material=Rayon|",
  "Fashion|Nalli|Nalli Kanchipuram Pure Silk Saree|9999|7499|saree,silk,women,kanchipuram,ethnic|Traditional Kanchipuram silk saree with zari border.|Material=Pure silk|featured",
  "Fashion|Soch|Soch Cotton Printed Saree|2499|1499|saree,cotton,women,ethnic|Soch lightweight cotton saree for daily wear.|Material=Cotton|",
  "Fashion|Vero Moda|Vero Moda Women Casual Top|1499|899|top,women,casual|Vero Moda casual top.|Material=Cotton blend|",
  "Fashion|Go Colors|Go Colors Women Ankle Leggings|899|599|leggings,women|Go Colors stretchable ankle-length leggings.|Material=Cotton Lycra|best",
  "Fashion|Tommy Hilfiger|Tommy Hilfiger Men Leather Belt|2499|1799|belt,leather,men,tommy|Tommy Hilfiger reversible leather belt.|Material=Leather|",
  "Fashion|Zara|Zara Women Floral Midi Dress|3990|2990|dress,women,floral,zara|Zara floral midi dress.|Material=Viscose|",
  "Fashion|H&M|H&M Men Regular Fit Cotton Shirt|1799|1299|shirt,men,casual,hm|H&M regular fit casual shirt.|Material=Cotton|",
  "Fashion|Decathlon|Decathlon Men Running T-Shirt|599|399|tshirt,men,sports,running,decathlon|Quick-dry running t-shirt.|Material=Polyester|",

  // ------------------------------------------------------------------ SHOES
  "Shoes|Nike|Nike Revolution 7 Men Running Shoes|3995|3199|shoes,nike,running,men|Nike Revolution 7 lightweight road running shoes.|Type=Running|best",
  "Shoes|Nike|Nike Court Vision Low Sneakers|5495|4399|shoes,nike,sneakers,casual|Classic basketball-inspired Nike sneakers.|Type=Casual|",
  "Shoes|Adidas|Adidas Runfalcon 5 Running Shoes|3999|2399|shoes,adidas,running|Adidas Runfalcon comfortable everyday running shoes.|Type=Running|best",
  "Shoes|Adidas|Adidas Samba OG Sneakers|11999|10199|shoes,adidas,sneakers,casual|Iconic Adidas Samba OG sneakers.|Type=Casual|featured",
  "Shoes|Puma|Puma Softride Enzo Running Shoes|3999|1999|shoes,puma,running|Puma Softride cushioned running shoes.|Type=Running|",
  "Shoes|Reebok|Reebok Energen Run Men Running Shoes|3299|1499|shoes,reebok,running|Reebok Energen Run lightweight shoes.|Type=Running|",
  "Shoes|ASICS|ASICS Gel-Contend 8 Running Shoes|5499|3699|shoes,asics,running|ASICS Gel-Contend 8 with GEL cushioning.|Type=Running|",
  "Shoes|New Balance|New Balance 574 Core Sneakers|9999|7999|shoes,new balance,sneakers,casual|New Balance 574 classic sneakers.|Type=Casual|",
  "Shoes|Campus|Campus OG-01 Running Shoes|1799|899|shoes,campus,running,budget|Campus lightweight running shoes.|Type=Running|best",
  "Shoes|Crocs|Crocs Classic Clog|3495|2799|shoes,crocs,clog,casual|Crocs Classic Clog - lightweight and comfortable.|Type=Clog|",
  "Shoes|Woodland|Woodland Men Leather Trekking Boots|5495|3999|shoes,woodland,boots,trekking|Woodland rugged leather boots.|Type=Boots|",
  "Shoes|Red Tape|Red Tape Men Formal Derby Shoes|3999|1999|shoes,red tape,formal,men|Red Tape formal leather shoes.|Type=Formal|",
  "Shoes|Sparx|Sparx Men Floater Sandals|1099|699|shoes,sparx,sandals,men|Sparx comfortable floater sandals.|Type=Sandals|",
  "Shoes|Metro|Metro Women Block Heel Sandals|2499|1599|shoes,metro,heels,women,sandals|Metro block heel sandals for women.|Type=Heels|",

  // ------------------------------------------------------------------ WATCHES
  "Watches|Apple|Apple Watch Series 10 (GPS, 42mm)|46900|44900|watch,smartwatch,apple,fitness|Apple Watch Series 10 with the biggest display yet.|Size=42mm;Connectivity=GPS|featured",
  "Watches|Apple|Apple Watch SE (2nd Gen, GPS, 40mm)|29900|24900|watch,smartwatch,apple,fitness|Apple Watch SE with essential health and fitness features.|Size=40mm;Connectivity=GPS|best",
  "Watches|Apple|Apple Watch Ultra 2 (GPS + Cellular)|89900|79900|watch,smartwatch,apple,ultra,adventure|Apple Watch Ultra 2 for extreme adventures.|Size=49mm;Connectivity=GPS+Cellular|",
  "Watches|Samsung|Samsung Galaxy Watch7 44mm Bluetooth|32999|26999|watch,smartwatch,samsung,galaxy|Galaxy Watch7 with advanced sleep and health tracking.|Size=44mm|",
  "Watches|Google|Google Pixel Watch 3 (41mm)|39900|36900|watch,smartwatch,google,pixel|Pixel Watch 3 with Fitbit health tracking.|Size=41mm|",
  "Watches|Garmin|Garmin Forerunner 55 GPS Running Watch|20990|17990|watch,smartwatch,garmin,running,gps|Garmin Forerunner 55 GPS running watch.|Battery=2 weeks|",
  "Watches|Amazfit|Amazfit Active 2 Smartwatch|9999|7999|watch,smartwatch,amazfit,fitness|Amazfit Active 2 with AMOLED display and GPS.|Battery=10 days|",
  "Watches|Noise|Noise Pulse 2 Max Smartwatch|5999|1399|watch,smartwatch,noise,budget|Noise Pulse 2 Max with Bluetooth calling.|Battery=10 days|best",
  "Watches|boAt|boAt Lunar Connect Smartwatch|7999|2199|watch,smartwatch,boat,budget|boAt Lunar Connect with calling and AMOLED display.|Battery=7 days|",
  "Watches|Fire-Boltt|Fire-Boltt Ninja Call Pro Plus Smartwatch|16999|1199|watch,smartwatch,fire-boltt,budget|Fire-Boltt Ninja Call Pro Plus with 1.83-inch display.|Battery=7 days|best",
  "Watches|Casio|Casio G-Shock GA-2100-1A1 Men Watch|10995|8995|watch,casio,g-shock,men,analog digital|Casio G-Shock Carbon Core guard watch.|Water Resistance=200m|featured",
  "Watches|Fastrack|Fastrack Limitless FS1 Pro Smartwatch|5995|1999|watch,smartwatch,fastrack|Fastrack Limitless FS1 Pro with AMOLED display.|Battery=7 days|",
  "Watches|Timex|Timex Weekender Men Analog Watch|3495|2695|watch,timex,men,analog|Timex Weekender with Indiglo night-light.|Water Resistance=30m|",
  "Watches|Fossil|Fossil Grant Chronograph Men Watch|11995|7197|watch,fossil,men,chronograph|Fossil Grant chronograph with leather strap.|Case=44mm|",
  "Watches|Seiko|Seiko 5 Sports Automatic Men Watch|29900|23900|watch,seiko,automatic,men|Seiko 5 Sports automatic with day-date display.|Movement=Automatic|",
  "Watches|Sonata|Sonata Women Analog Watch|2495|1695|watch,sonata,women,analog|Sonata classic women analog watch.|Case=Gold tone|",

  // ------------------------------------------------------------------ BEAUTY
  "Beauty|Maybelline|Maybelline Lash Sensational Sky High Mascara|799|649|mascara,makeup,maybelline|Sky High mascara for long, full lashes.|Type=Mascara|best",
  "Beauty|Lakme|Lakme Eyeconic Kajal|200|179|kajal,makeup,lakme|Smudge-proof 24-hour kajal.|Type=Kajal|",
  "Beauty|L'Oreal Paris|L'Oreal Paris Hyaluronic Acid Serum 30ml|999|749|serum,skincare,loreal|L'Oreal Revitalift Hyaluronic Acid serum for hydrated skin.|Volume=30ml|",
  "Beauty|Minimalist|Minimalist 10% Niacinamide Face Serum 30ml|599|569|serum,skincare,minimalist,niacinamide|Minimalist 10% Niacinamide serum for oil control.|Volume=30ml|best",
  "Beauty|Minimalist|Minimalist 2% Salicylic Acid Serum 30ml|599|569|serum,skincare,minimalist,acne|Minimalist salicylic acid serum for acne-prone skin.|Volume=30ml|",
  "Beauty|Neutrogena|Neutrogena Ultra Sheer Sunscreen SPF 50+ 80g|599|539|sunscreen,skincare,neutrogena|Lightweight Neutrogena sunscreen with SPF 50+.|Weight=80g|best",
  "Beauty|Cetaphil|Cetaphil Gentle Skin Cleanser 250ml|599|569|cleanser,facewash,skincare,cetaphil|Cetaphil gentle cleanser for sensitive skin.|Volume=250ml|",
  "Beauty|CeraVe|CeraVe Moisturising Lotion 355ml|1250|1099|moisturizer,skincare,cerave|CeraVe daily moisturising lotion with ceramides.|Volume=355ml|",
  "Beauty|Garnier|Garnier Bright Complete Vitamin C Face Wash 150g|350|245|facewash,skincare,garnier|Garnier Vitamin C face wash for brighter skin.|Weight=150g|",
  "Beauty|Nivea|Nivea Soft Light Moisturizer Cream 200ml|300|250|moisturizer,skincare,nivea|Nivea Soft cream for face, hands and body.|Volume=200ml|",
  "Beauty|Dove|Dove Intense Repair Shampoo 650ml|750|549|shampoo,haircare,dove|Dove shampoo for damaged hair.|Volume=650ml|",
  "Beauty|Head & Shoulders|Head & Shoulders Cool Menthol Shampoo 650ml|650|459|shampoo,haircare,anti-dandruff|Head & Shoulders anti-dandruff shampoo.|Volume=650ml|",
  "Beauty|Mamaearth|Mamaearth Onion Shampoo 400ml|599|449|shampoo,haircare,mamaearth|Mamaearth onion shampoo for hair fall control.|Volume=400ml|",
  "Beauty|Philips|Philips BT3231 Beard Trimmer|1695|1249|trimmer,grooming,philips,men|Philips beard trimmer with 20 length settings.|Battery=60 min|best",
  "Beauty|Philips|Philips OneBlade QP2724 Trimmer|1999|1495|trimmer,shaver,grooming,philips,men|Philips OneBlade to trim, edge and shave.|Battery=45 min|",
  "Beauty|Philips|Philips HP8100 Hair Dryer 1000W|1245|799|hair dryer,haircare,philips|Philips compact hair dryer with 1000W.|Power=1000W|",
  "Beauty|Dyson|Dyson Airwrap Multi-styler|45900|43900|hair styler,haircare,dyson,premium|Dyson Airwrap multi-styler to curl, wave and smooth.|Type=Multi-styler|featured",
  "Beauty|Fogg|Fogg Master Marco Deodorant 150ml|349|269|deodorant,perfume,fogg,men|Fogg gas-free deodorant.|Volume=150ml|",
  "Beauty|Davidoff|Davidoff Cool Water Men EDT 125ml|4300|3900|perfume,fragrance,davidoff,men|Davidoff Cool Water fresh aquatic fragrance.|Volume=125ml|",
  "Beauty|Calvin Klein|Calvin Klein CK One EDT 100ml|6300|4000|perfume,fragrance,calvin klein,unisex|Calvin Klein CK One unisex fragrance.|Volume=100ml|",
  "Beauty|Oral-B|Oral-B Vitality 100 Electric Toothbrush|1899|1299|toothbrush,oral care,oral-b|Oral-B rechargeable electric toothbrush.|Type=Rechargeable|",
  "Beauty|WOW|WOW Apple Cider Vinegar Shampoo 300ml|599|399|shampoo,haircare,wow|WOW ACV shampoo for shiny hair.|Volume=300ml|",

  // ------------------------------------------------------------------ HOME APPLIANCES
  "Home Appliances|Dyson|Dyson V12 Detect Slim Cordless Vacuum|54900|52900|vacuum,cleaner,dyson,cordless|Dyson V12 Detect Slim with laser dust detection.|Runtime=60 min|featured",
  "Home Appliances|Xiaomi|Xiaomi Robot Vacuum-Mop 2i|24999|18999|vacuum,robot,xiaomi,cleaner|Xiaomi robot vacuum and mop with LDS navigation.|Suction=2200Pa|",
  "Home Appliances|LG|LG 7kg 5 Star Front Load Washing Machine|38990|29990|washing machine,lg,front load,appliance|LG 7kg inverter direct drive washing machine.|Capacity=7kg|best",
  "Home Appliances|IFB|IFB 6.5kg 5 Star Front Load Washing Machine|36990|26990|washing machine,ifb,front load,appliance|IFB 6.5kg front load with aqua energie.|Capacity=6.5kg|",
  "Home Appliances|Whirlpool|Whirlpool 7.5kg 5 Star Top Load Washing Machine|19500|15490|washing machine,whirlpool,top load,appliance|Whirlpool top load with Zen Pro technology.|Capacity=7.5kg|",
  "Home Appliances|Samsung|Samsung 653L Side by Side Refrigerator|94990|74990|refrigerator,fridge,samsung,side by side,appliance|Samsung 653L side by side fridge with SpaceMax.|Capacity=653 Litres|",
  "Home Appliances|Whirlpool|Whirlpool 192L 2 Star Direct Cool Refrigerator|17150|12990|refrigerator,fridge,whirlpool,single door,appliance|Whirlpool 192L single door fridge.|Capacity=192 Litres|best",
  "Home Appliances|LG|LG 1.5 Ton 5 Star Dual Inverter Split AC|70990|44990|ac,air conditioner,lg,split ac,inverter|LG 1.5 ton 5 star AI dual inverter split AC.|Capacity=1.5 Ton;Rating=5 Star|featured",
  "Home Appliances|Daikin|Daikin 1.5 Ton 3 Star Inverter Split AC|57800|37990|ac,air conditioner,daikin,split ac,inverter|Daikin 1.5 ton 3 star inverter split AC.|Capacity=1.5 Ton;Rating=3 Star|",
  "Home Appliances|Voltas|Voltas 1.5 Ton 3 Star Inverter Split AC|53990|33990|ac,air conditioner,voltas,split ac,inverter|Voltas 1.5 ton 3 star inverter split AC.|Capacity=1.5 Ton;Rating=3 Star|",
  "Home Appliances|Atomberg|Atomberg Renesa 1200mm BLDC Ceiling Fan|4400|3150|fan,ceiling fan,atomberg,bldc|Atomberg BLDC fan saves up to 65% power.|Sweep=1200mm|best",
  "Home Appliances|Crompton|Crompton Energion 1200mm Ceiling Fan|3399|2399|fan,ceiling fan,crompton|Crompton Energion 5-star ceiling fan.|Sweep=1200mm|",
  "Home Appliances|Havells|Havells Instanio 3L Instant Water Heater|5290|3290|geyser,water heater,havells|Havells 3-litre instant geyser.|Capacity=3 Litres|",
  "Home Appliances|Racold|Racold Eterno 15L Storage Water Heater|12999|8999|geyser,water heater,racold|Racold 15-litre storage geyser.|Capacity=15 Litres|",
  "Home Appliances|Kent|Kent Grand Plus RO Water Purifier 9L|23000|17500|water purifier,ro,kent|Kent Grand Plus RO+UV+UF purifier.|Capacity=9 Litres|",
  "Home Appliances|Aquaguard|Aquaguard Aura 7L RO+UV Water Purifier|21990|15990|water purifier,ro,aquaguard|Aquaguard Aura RO+UV with active copper.|Capacity=7 Litres|",
  "Home Appliances|Prestige|Prestige PIC 20 Induction Cooktop|2995|1899|induction,cooktop,prestige,kitchen|Prestige 2000W induction cooktop.|Power=2000W|best",
  "Home Appliances|Philips|Philips GC1905 Steam Iron|1795|1145|iron,philips,steam iron|Philips 1440W steam iron.|Power=1440W|",
  "Home Appliances|Samsung|Samsung 23L Solo Microwave Oven|9990|8290|microwave,oven,samsung,kitchen|Samsung 23-litre solo microwave oven.|Capacity=23 Litres|",
  "Home Appliances|LG|LG 28L Convection Microwave Oven|17490|14990|microwave,oven,lg,convection,kitchen|LG 28-litre convection microwave.|Capacity=28 Litres|",
  "Home Appliances|Preethi|Preethi Zodiac MG 218 Mixer Grinder 750W|8995|6999|mixer,grinder,preethi,kitchen|Preethi Zodiac mixer grinder with 5 jars.|Power=750W|",
  "Home Appliances|Philips|Philips Air Purifier AC1215|11995|9995|air purifier,philips|Philips air purifier with HEPA filter.|Coverage=333 sq ft|",
  "Home Appliances|Bajaj|Bajaj Majesty RX11 Heat Convector|2899|1999|heater,room heater,bajaj|Bajaj 2000W room heater.|Power=2000W|",

  // ------------------------------------------------------------------ KITCHEN
  "Kitchen|Milton|Milton Thermosteel Flask 1000ml|1100|749|flask,bottle,milton|Milton thermosteel hot and cold flask.|Capacity=1000ml|best",
  "Kitchen|Prestige|Prestige Popular Aluminium Pressure Cooker 5L|1495|1099|pressure cooker,prestige,cookware|Prestige 5-litre outer lid pressure cooker.|Capacity=5 Litres|best",
  "Kitchen|Hawkins|Hawkins Contura Hard Anodised Pressure Cooker 3L|2000|1550|pressure cooker,hawkins,cookware|Hawkins Contura 3-litre pressure cooker.|Capacity=3 Litres|",
  "Kitchen|Pigeon|Pigeon Non-stick Cookware Set (3 pcs)|1749|1099|cookware,non-stick,pigeon|Pigeon non-stick tawa, kadhai and fry pan set.|Pieces=3|",
  "Kitchen|Wonderchef|Wonderchef Nutri-Blend 400W Blender|3999|2299|blender,mixer,wonderchef|Wonderchef Nutri-Blend personal blender.|Power=400W|",
  "Kitchen|Borosil|Borosil Glass Lunch Box Set of 3|949|769|lunch box,borosil,glass|Borosil microwave-safe glass lunch box set.|Pieces=3|",
  "Kitchen|Cello|Cello Opalware Dinner Set 18 pcs|2500|1799|dinner set,cello,crockery|Cello opalware dinner set for 6.|Pieces=18|",
  "Kitchen|Philips|Philips HD7432 Drip Coffee Maker|2995|2295|coffee maker,philips,kitchen|Philips drip coffee maker.|Capacity=0.6 Litres|",
  "Kitchen|Prestige|Prestige Deluxe Plus 3 Burner Gas Stove|5000|3299|gas stove,prestige,kitchen|Prestige 3-burner glass-top gas stove.|Burners=3|",
  "Kitchen|Lock&Lock|Lock&Lock Airtight Container Set (5 pcs)|1999|1399|container,storage,lock and lock|Lock&Lock airtight food containers.|Pieces=5|",

  // ------------------------------------------------------------------ SPORTS & FITNESS
  "Sports & Fitness|Yonex|Yonex Muscle Power 29 Badminton Racquet|1090|899|badminton,racquet,yonex,sports|Yonex Muscle Power aluminium racquet.|Weight=90g|",
  "Sports & Fitness|Yonex|Yonex Mavis 350 Nylon Shuttlecock (Pack of 6)|1090|999|badminton,shuttlecock,yonex,sports|Yonex Mavis 350 shuttlecocks.|Quantity=6|",
  "Sports & Fitness|SG|SG Kashmir Willow Cricket Bat|1899|1299|cricket,bat,sg,sports|SG Kashmir willow bat for tennis ball cricket.|Material=Kashmir Willow|best",
  "Sports & Fitness|Cosco|Cosco Football Size 5|599|449|football,cosco,sports|Cosco machine-stitched football.|Size=5|",
  "Sports & Fitness|Nivia|Nivia Storm Football Size 5|489|399|football,nivia,sports|Nivia Storm football.|Size=5|",
  "Sports & Fitness|Boldfit|Boldfit Yoga Mat 6mm Anti-skid|999|449|yoga mat,boldfit,fitness|Boldfit anti-skid yoga mat.|Thickness=6mm|best",
  "Sports & Fitness|Boldfit|Boldfit Resistance Bands Set|699|299|resistance band,boldfit,fitness|Boldfit resistance bands set of 5.|Pieces=5|",
  "Sports & Fitness|Kore|Kore PVC 20kg Home Gym Dumbbell Set|3499|1999|dumbbell,kore,gym,fitness|Kore PVC dumbbell set with rods.|Weight=20kg|",
  "Sports & Fitness|MuscleBlaze|MuscleBlaze Biozyme Whey Protein 1kg|3999|3050|protein,whey,muscleblaze,fitness,supplement|MuscleBlaze Biozyme whey protein with EAF.|Weight=1kg|",
  "Sports & Fitness|Optimum Nutrition|Optimum Nutrition Gold Standard Whey 2 lb|4999|4299|protein,whey,optimum nutrition,fitness,supplement|ON Gold Standard 100% whey.|Weight=2 lb|",
  "Sports & Fitness|Lifelong|Lifelong FitPro 2HP Treadmill|24999|16999|treadmill,lifelong,fitness|Lifelong 2HP motorised treadmill.|Motor=2HP|",
  "Sports & Fitness|Decathlon|Decathlon Kalenji Running Armband|499|349|running,armband,decathlon,fitness|Phone armband for running.|Size=Universal|",

  // ------------------------------------------------------------------ BOOKS
  "Books|Penguin|Atomic Habits by James Clear|799|449|book,self help,habits,james clear|Tiny changes, remarkable results - bestselling book on habits.|Pages=320;Language=English|featured,best",
  "Books|Jaico|Rich Dad Poor Dad by Robert Kiyosaki|499|339|book,finance,money,robert kiyosaki|Classic personal finance book.|Pages=336;Language=English|best",
  "Books|Jaico|The Psychology of Money by Morgan Housel|399|299|book,finance,money,morgan housel|Timeless lessons on wealth, greed and happiness.|Pages=252;Language=English|best",
  "Books|Penguin|Ikigai by Hector Garcia|399|269|book,self help,ikigai|The Japanese secret to a long and happy life.|Pages=208;Language=English|",
  "Books|Hachette|Deep Work by Cal Newport|599|399|book,productivity,cal newport|Rules for focused success in a distracted world.|Pages=304;Language=English|",
  "Books|HarperCollins|The Alchemist by Paulo Coelho|399|279|book,novel,fiction,paulo coelho|A magical story about following your dreams.|Pages=208;Language=English|best",
  "Books|Prabhat|Wings of Fire by A.P.J. Abdul Kalam|350|260|book,biography,apj abdul kalam|Autobiography of Dr. A.P.J. Abdul Kalam.|Pages=180;Language=English|",
  "Books|Manjul|The Subtle Art of Not Giving a F*ck|499|351|book,self help,mark manson|A counterintuitive approach to living a good life.|Pages=224;Language=English|",
  "Books|Penguin|Sapiens: A Brief History of Humankind|799|569|book,history,yuval noah harari|Bestselling history of humankind.|Pages=512;Language=English|",
  "Books|Virgin|Zero to One by Peter Thiel|499|379|book,business,startup,peter thiel|Notes on startups and how to build the future.|Pages=224;Language=English|",
  "Books|Bloomsbury|Harry Potter and the Philosopher's Stone|499|399|book,novel,fiction,harry potter|The first Harry Potter novel (paperback).|Pages=336;Language=English|best",
  "Books|Alliance|Ponniyin Selvan (Tamil) by Kalki - Set of 5|1800|1350|book,novel,tamil,kalki,ponniyin selvan|Kalki's epic Tamil historical novel in 5 volumes.|Language=Tamil;Volumes=5|",
  "Books|Wiley|Python Crash Course by Eric Matthes|3499|2399|book,programming,python,coding|Hands-on, project-based introduction to Python.|Pages=544;Language=English|",
  "Books|Pearson|Clean Code by Robert C. Martin|4299|3199|book,programming,software|A handbook of agile software craftsmanship.|Pages=464;Language=English|",

  // ------------------------------------------------------------------ ACCESSORIES
  "Accessories|Apple|Apple 20W USB-C Power Adapter|1900|1799|charger,apple,adapter,accessory|Apple 20W USB-C fast charger for iPhone and iPad.|Power=20W|",
  "Accessories|Samsung|Samsung 25W USB-C Super Fast Charger|1999|1299|charger,samsung,adapter,accessory|Samsung 25W super fast charger.|Power=25W|best",
  "Accessories|Anker|Anker 20000mAh 22.5W Power Bank|4999|3499|powerbank,anker,charging|Anker 20000mAh power bank with 22.5W fast charge.|Capacity=20000mAh|best",
  "Accessories|Xiaomi|Mi Power Bank 3i 20000mAh|2999|1899|powerbank,xiaomi,mi,charging|Mi 20000mAh power bank with 18W fast charging.|Capacity=20000mAh|",
  "Accessories|Ray-Ban|Ray-Ban Aviator Classic Sunglasses|9990|8490|sunglasses,rayban,aviator|Ray-Ban Aviator Classic RB3025.|Lens=Polarized option|featured",
  "Accessories|Wildcraft|Wildcraft 35L Laptop Backpack|2799|1599|backpack,bag,wildcraft,laptop bag|Wildcraft 35 litre backpack with laptop sleeve.|Capacity=35L|best",
  "Accessories|Skybags|Skybags 30L Casual Backpack|2300|1199|backpack,bag,skybags|Skybags 30 litre casual backpack.|Capacity=30L|",
  "Accessories|Safari|Safari Pentagon 55cm Cabin Trolley Bag|4999|2799|trolley,luggage,safari,travel bag|Safari 55cm hard-case cabin trolley.|Size=55cm|",
  "Accessories|Hidesign|Hidesign Men Leather Wallet|2495|1995|wallet,leather,hidesign,men|Hidesign genuine leather wallet.|Material=Leather|",
  "Accessories|Spigen|Spigen Ultra Hybrid Case for iPhone 16|1999|1299|case,cover,spigen,iphone|Spigen clear hybrid case for iPhone 16.|Compatible=iPhone 16|",
  "Accessories|Apple|Apple MagSafe Charger (1m)|4500|3999|charger,apple,magsafe,wireless|Apple MagSafe wireless charger for iPhone.|Power=15W|",
  "Accessories|Ambrane|Ambrane 60W Type-C Fast Charging Cable 1.5m|499|249|cable,ambrane,usb-c,charging|Ambrane 60W braided Type-C cable.|Length=1.5m|",
];

// ---------------------------------------------------------------------------
// Image helpers: reuse photos from the original catalog by product type, and fall back
// to a generated SVG tile so a card is NEVER blank (works offline too).
// ---------------------------------------------------------------------------
const POOLS = {
  Mobiles: ["photo-1610945415295-d9bbf067e59c", "photo-1592750475338-74b7b21085ab", "photo-1598327105666-5b89351aff97", "photo-1580910051074-3eb694886505", "photo-1511707171634-5f897ff02aa9", "photo-1601784551446-20c9e07cdbdb", "photo-1695048133142-1a20484d2569"],
  Laptops: ["photo-1496181133206-80ce9b88a853", "photo-1603302576837-37561b2e2302", "photo-1588872657578-7efd1f1555ed", "photo-1517336714731-489689fd1ca8", "photo-1541807084-5c52b6b3adef", "photo-1525547719571-a2d4ac8945e2", "photo-1531297484001-80022131f5a1"],
  Fashion: ["photo-1551028719-00167b16eac5", "photo-1595777457583-95e059d581b8", "photo-1602810318383-e386cc2a3ccf", "photo-1542272604-787c3835535d", "photo-1583391733956-6c78276477e2", "photo-1556821840-3a63f95609a7"],
  Beauty: ["photo-1596462502278-27bfdc403348", "photo-1620916566398-39f1143ab7be", "photo-1586495777744-4413f21062fa", "photo-1608248543803-ba4f8c70ae0b", "photo-1631730359585-38a4935cbec4", "photo-1556228720-195a672e8a03"],
  "Home Appliances": ["photo-1585515320310-259814833e62", "photo-1585237017125-24baf8d7406f", "photo-1571175443880-49e1d25b2bc5", "photo-1631889993959-41b4e9c6e3c5", "photo-1594213916553-d445a4a4b98a", "photo-1626806787461-102c1bfaaea1"],
  Accessories: ["photo-1572635196237-14b3f281503f", "photo-1609091839311-d5365f9ff1c5", "photo-1627123424574-724758594e93", "photo-1583863788434-e58a36330cf0", "photo-1553062407-98eeb64c6a62"],
  Shoes: ["photo-1542291026-7eec264c27ff", "photo-1595950653106-6c9ebd614d3a", "photo-1608231387042-66d1773070a5", "photo-1614252369475-531eba835eb1", "photo-1600185365483-26d7a4cc7519"],
  Watches: ["photo-1524592094714-0f0654e20314", "photo-1523275335684-37898b6baf30", "photo-1508685096489-7aacd43bd3b1", "photo-1524805444758-089113d48a6d", "photo-1579586337278-3befd40fd17a"],
};
const ELECTRONICS_BY_TAG = {
  headphones: "photo-1583394838336-acd977736f90",
  earbuds: "photo-1590658268037-6bf12165a8df",
  neckband: "photo-1546435770-a3e426bf472b",
  speaker: "photo-1608043152269-423dbba4e7e1",
  tv: "photo-1593305841991-05c297ba4575",
  camera: "photo-1516035069371-29a1b244cc32",
  monitor: "photo-1527443224154-c4a3942d3acf",
  mouse: "photo-1527864550417-7fd91fc51a46",
};

const HUES = { Tablets: 215, Gaming: 275, Kitchen: 25, "Sports & Fitness": 140, Books: 350, Electronics: 200, Mobiles: 210, Laptops: 220, Fashion: 330, Beauty: 320, "Home Appliances": 170, Accessories: 45, Shoes: 10, Watches: 250 };

const svgTile = (brand, name, category) => {
  const hue = HUES[category] ?? 210;
  const words = name.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 20) {
      lines.push(cur.trim());
      cur = w;
    } else cur = `${cur} ${w}`;
  }
  if (cur.trim()) lines.push(cur.trim());
  const shown = lines.slice(0, 3);
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const tspans = shown.map((l, i) => `<tspan x="400" dy="${i === 0 ? 0 : 46}">${esc(l)}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,92%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,80%)"/></linearGradient></defs><rect width="800" height="800" fill="url(#g)"/><text x="400" y="300" text-anchor="middle" font-family="Arial,sans-serif" font-size="40" font-weight="700" fill="hsl(${hue},45%,30%)" letter-spacing="4">${esc(brand.toUpperCase())}</text><text x="400" y="380" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" fill="hsl(${hue},40%,20%)">${tspans}</text><text x="400" y="700" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="hsl(${hue},35%,35%)">${esc(category)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const pickImages = (category, tags, name, brand, idx) => {
  if (category === "Electronics") {
    const t = tags.find((x) => ELECTRONICS_BY_TAG[x]);
    if (t) return [img(ELECTRONICS_BY_TAG[t])];
    return [svgTile(brand, name, category)];
  }
  const pool = POOLS[category];
  if (pool) return [img(pool[hash(name) % pool.length])];
  return [svgTile(brand, name, category)];
};

const SIZES = {
  Fashion: ["S", "M", "L", "XL"],
  Shoes: ["6", "7", "8", "9", "10"],
};

export const buildExtraProducts = () =>
  ROWS.map((row, idx) => {
    const [category, brand, name, mrp, price, tags, description, specs, flags = ""] = row.split("|");
    const h = hash(name);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const p = {
      name,
      brand,
      category,
      price: Number(mrp),
      discountPrice: Number(price) < Number(mrp) ? Number(price) : null,
      images: pickImages(category, tagList, name, brand, idx),
      stock: 8 + (h % 190),
      rating: Math.round((3.8 + ((h >> 3) % 100) / 100) * 10) / 10,
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
