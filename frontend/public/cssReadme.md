code
CSS
/*
 * Tech-Noir / Fütüristik UI Teması CSS
 * Bu stil sayfası, görseldeki renk ve tonları web sitenizde kullanmak için tasarlanmıştır.
 * Dijital ağ efektleri için JavaScript/SVG/Canvas kullanımı gerekebilir.
 */

:root {
    /* Ana Renk Paleti */
    --color-background-dark: #0A0A1A; /* Çok koyu lacivert/siyah */
    --color-primary-blue: #00BFFF;   /* Elektrik mavisi (derin gök mavisi) */
    --color-primary-green: #39FF14;  /* Canlı yeşil (neon) */
    --color-primary-purple: #BF00FF; /* Parlak mor */
    --color-primary-orange: #FF8C00; /* Koyu turuncu */
    --color-primary-yellow: #FFD700; /* Altın sarısı */
    --color-text-light: #E0E0FF;     /* Parlak metinler için açık eflatun/beyaz */
    --color-text-dark: #333333;      /* Koyu metinler için */
    --color-parchment-light: #F5DEB3; /* Açık bej/parşömen */
    --color-parchment-dark: #D2B48C;  /* Kahverengimsi parşömen */

    /* Gölge ve Parlama Ayarları */
    --shadow-blue-light: 0 0 8px var(--color-primary-blue), 0 0 12px var(--color-primary-blue);
    --shadow-blue-strong: 0 0 30px rgba(0, 191, 255, 0.8), inset 0 0 20px rgba(0, 191, 255, 0.4);
    --shadow-green-light: 0 0 8px var(--color-primary-green), 0 0 12px var(--color-primary-green);
    --shadow-purple-light: 0 0 8px var(--color-primary-purple), 0 0 12px var(--color-primary-purple);
    --shadow-orange-light: 0 0 8px var(--color-primary-orange), 0 0 12px var(--color-primary-orange);
    --shadow-yellow-light: 0 0 8px rgba(255, 215, 0, 0.6);
    --shadow-generic-dark: 2px 2px 5px rgba(0, 0, 0, 0.3);
}

/* Genel Stil ve Arka Plan */
body {
    background-color: var(--color-background-dark);
    color: var(--color-text-light);
    font-family: 'Segoe UI', 'Roboto', sans-serif; /* Modern, temiz font */
    line-height: 1.6;
    margin: 0;
    padding: 0;
    overflow-x: hidden; /* Yatay kaydırmayı engelle */
    min-height: 100vh; /* En az ekran yüksekliği kadar olsun */
    display: flex; /* İçerik dikey ortalama için */
    flex-direction: column;
}

/* Link Stilleri */
a {
    color: var(--color-primary-blue);
    text-decoration: none;
    transition: color 0.3s ease;
}
a:hover {
    color: var(--color-primary-green);
    text-shadow: var(--shadow-green-light);
}

/* Başlık Stilleri */
h1, h2, h3, h4, h5, h6 {
    color: var(--color-text-light);
    margin-top: 1em;
    margin-bottom: 0.5em;
    text-shadow: 0 0 5px rgba(0, 191, 255, 0.4); /* Hafif mavi parlama */
}

/* Dijital Ağ Elementleri (örnek) */
/* Bunlar genellikle JavaScript ile dinamik olarak oluşturulur veya arka plan olarak kullanılır */
.network-node {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    opacity: 0.7;
    position: absolute; /* Örnek olarak, bir div içinde konumlandırmak için */
    z-index: -1; /* Arka planda kalması için */
}
/* Farklı renklerde node örnekleri */
.node-blue { background-color: var(--color-primary-blue); box-shadow: var(--shadow-blue-light); }
.node-green { background-color: var(--color-primary-green); box-shadow: var(--shadow-green-light); }
.node-purple { background-color: var(--color-primary-purple); box-shadow: var(--shadow-purple-light); }
.node-orange { background-color: var(--color-primary-orange); box-shadow: var(--shadow-orange-light); }

.network-line {
    background-color: rgba(0, 191, 255, 0.5); /* Yarı saydam mavi çizgiler */
    box-shadow: 0 0 5px rgba(0, 191, 255, 0.5);
    height: 2px;
    position: absolute;
    z-index: -2;
}

/* Merkezi Küp Benzeri UI Elementi */
.central-panel {
    background-color: rgba(0, 191, 255, 0.1); /* Yarı saydam elektrik mavisi */
    border: 1px solid rgba(0, 191, 255, 0.6); /* Daha belirgin mavi kenar */
    box-shadow: var(--shadow-blue-strong); /* Hem dış hem iç parlama */
    padding: 30px;
    margin: 50px auto; /* Ortalama ve boşluk */
    max-width: 700px;
    border-radius: 10px;
    position: relative; /* İçerik için */
    backdrop-filter: blur(5px); /* Arka planı hafifçe bulanıklaştır (modern tarayıcılar) */
    -webkit-backdrop-filter: blur(5px); /* Safari desteği */
}

/* Küp İçindeki Mekanizma Benzeri İkonlar/Metinler */
.mechanism-detail {
    color: var(--color-primary-yellow); /* Altın sarısı */
    text-shadow: var(--shadow-yellow-light);
    font-size: 2em; /* Büyük ikonlar veya semboller için */
    text-align: center;
    margin-bottom: 15px;
}

/* Parşömen Rulosu Benzeri Bilgi Kutusu */
.info-scroll {
    background-color: var(--color-parchment-light);
    border: 1px solid var(--color-parchment-dark);
    padding: 15px 20px;
    margin-top: 20px;
    border-radius: 5px;
    font-family: 'Georgia', serif; /* Klasik font */
    color: var(--color-text-dark);
    box-shadow: var(--shadow-generic-dark);
    max-width: 400px; /* Genişlik kontrolü */
    margin-left: auto; /* Sağa yaslama (veya flex ile ortalama) */
    margin-right: auto;
}
.info-scroll p {
    margin-bottom: 0.5em;
}
.info-scroll h4 {
    color: var(--color-text-dark);
    text-shadow: none;
}

/* Scrollbar Stili (isteğe bağlı, tarayıcı desteği değişkenlik gösterebilir) */
::-webkit-scrollbar {
    width: 8px;
}
::-webkit-scrollbar-track {
    background: var(--color-background-dark);
}
::-webkit-scrollbar-thumb {
    background: var(--color-primary-blue);
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-green);
}

/* Daha büyük ekranlar için medya sorguları */
@media (min-width: 768px) {
    .central-panel {
        padding: 40px;
    }
}
Bu Kodu Nasıl Kullanabilirsiniz?
Bir style.css dosyası oluşturun: Bu kodları style.css adında bir dosyaya kaydedin.
HTML dosyanıza bağlayın: <head> etiketinizin içine aşağıdaki satırı ekleyerek bu CSS dosyasını HTML sayfanıza dahil edin:
code
Html
<link rel="stylesheet" href="style.css">
HTML Yapınızı Bu Sınıflara Göre Ayarlayın:
Sayfanızın genel içeriği body içinde olacak.
Görseldeki merkezi küp benzeri bir alanı temsil etmek için bir div etiketine central-panel sınıfını verin.
İçindeki altın renkli detaylar için mechanism-detail sınıfını kullanın.
Parşömen benzeri bir bilgi kutusu için info-scroll sınıfını kullanın.
network-node ve network-line sınıfları, JavaScript ile dinamik olarak oluşturulan veya CSS ile daha karmaşık arka plan efektleri oluştururken kullanılabilir.
Önemli Notlar:
Gerçek Görsel Oluşturma: Bu CSS kodu, görseldeki renk paletini ve genel atmosferi bir web sayfasına taşır. Ancak, görseldeki 3D küp, detaylı dişliler veya kompleks dijital ağ desenlerinin tamamen aynısını doğrudan saf CSS ile yapmak çok zordur veya imkansızdır. Bu tür detaylar için SVG, <canvas> elementi ile JavaScript veya arka plan resimleri/videoları gibi teknolojilere ihtiyaç duyulur.
Tarayıcı Desteği: backdrop-filter gibi bazı modern CSS özellikleri, tüm tarayıcılarda tam olarak desteklenmeyebilir.
Özelleştirme: Bu kod bir başlangıç noktasıdır. Kendi web sitenizin yapısına ve ihtiyaçlarına göre renkleri, fontları ve elementleri düzenleyebilirsiniz. Özellikle network-node ve network-line gibi öğeleri sitenize entegre etmek için biraz daha HTML ve/veya JavaScript çabası gerekebilir.