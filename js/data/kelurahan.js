/**
 * js/data/kelurahan.js
 * Data 69 kelurahan Kota Bitung dengan koordinat terverifikasi dari ibnux & API BMKG
 * Sumber: Kepmendagri 100.1.1-6117 Tahun 2022
 */

export const bitungKelurahan = [
  // Kecamatan Lembeh Selatan (01) - 7 kelurahan
  { name: 'Pasir Panjang',  kecamatan: 'Lembeh Selatan', code: '71.72.01.1001', coords: [1.4021606434, 125.1851532569], info: 'Pulau Lembeh - Pesisir selatan' },
  { name: 'Paudean',        kecamatan: 'Lembeh Selatan', code: '71.72.01.1002', coords: [1.4150732359, 125.1834146151], info: 'Pulau Lembeh - Kawasan nelayan' },
  { name: 'Batulubang',     kecamatan: 'Lembeh Selatan', code: '71.72.01.1003', coords: [1.4238268793, 125.1974538955], info: 'Pulau Lembeh - Area diving populer' },
  { name: 'Papusungan',     kecamatan: 'Lembeh Selatan', code: '71.72.01.1004', coords: [1.4261409625, 125.2135776456], info: 'Pulau Lembeh - Pesisir tengah' },
  { name: 'Pancuran',       kecamatan: 'Lembeh Selatan', code: '71.72.01.1006', coords: [1.4186647933, 125.2420455986], info: 'Pulau Lembeh - Spot snorkeling' },
  { name: 'Dorbolaang',     kecamatan: 'Lembeh Selatan', code: '71.72.01.1011', coords: [1.4093795886, 125.2091104131], info: 'Pulau Lembeh - Kawasan nelayan barat' },
  { name: 'Kelapa Dua',     kecamatan: 'Lembeh Selatan', code: '71.72.01.1016', coords: [1.4283448244, 125.2261614159], info: 'Pulau Lembeh - Kawasan tengah selatan' },

  // Kecamatan Madidir (02) - 8 kelurahan
  { name: 'Wangurer Barat',  kecamatan: 'Madidir', code: '71.72.02.1001', coords: [1.4553564536, 125.1449754013], info: 'Pusat pemerintahan Kota Bitung' },
  { name: 'Paceda',          kecamatan: 'Madidir', code: '71.72.02.1002', coords: [1.4583633896, 125.1585461427], info: 'Kawasan permukiman padat' },
  { name: 'Madidir Ure',     kecamatan: 'Madidir', code: '71.72.02.1003', coords: [1.4625907574, 125.1697540392], info: 'Kawasan perdagangan kota' },
  { name: 'Kadoodan',        kecamatan: 'Madidir', code: '71.72.02.1004', coords: [1.4636412841, 125.1779292553], info: 'Kawasan permukiman barat kota' },
  { name: 'Madidir Weru',    kecamatan: 'Madidir', code: '71.72.02.1006', coords: [1.4623359406, 125.1739584181], info: 'Kawasan permukiman Madidir' },
  { name: 'Madidir Unet',    kecamatan: 'Madidir', code: '71.72.02.1007', coords: [1.4608315450, 125.1649088328], info: 'Kawasan permukiman Madidir Unet' },
  { name: 'Wangurer Timur',  kecamatan: 'Madidir', code: '71.72.02.1009', coords: [1.4433328797, 125.1496871705], info: 'Kawasan timur Wangurer' },
  { name: 'Wangurer Utara',  kecamatan: 'Madidir', code: '71.72.02.1011', coords: [1.4595647336, 125.1513059281], info: 'Kawasan utara Wangurer' },

  // Kecamatan Ranowulu (03) - 11 kelurahan
  { name: 'Karondoran',      kecamatan: 'Ranowulu', code: '71.72.03.1001', coords: [1.5167575444, 125.0777876735], info: 'Dataran tinggi - pintu masuk barat kota' },
  { name: 'Kumeresot',       kecamatan: 'Ranowulu', code: '71.72.03.1002', coords: [1.4677118495, 125.0668830891], info: 'Kawasan perkebunan' },
  { name: 'Pinokalan',       kecamatan: 'Ranowulu', code: '71.72.03.1004', coords: [1.4579607935, 125.1123445696], info: 'Kawasan permukiman perbukitan' },
  { name: 'Tewaan',          kecamatan: 'Ranowulu', code: '71.72.03.1005', coords: [1.4744252222, 125.1151579699], info: 'Kawasan pertanian dataran tinggi' },
  { name: 'Danowudu',        kecamatan: 'Ranowulu', code: '71.72.03.1006', coords: [1.4757246263, 125.1348134071], info: 'Kawasan perbukitan Ranowulu' },
  { name: 'Duasadara',       kecamatan: 'Ranowulu', code: '71.72.03.1007', coords: [1.5071021963, 125.1477272036], info: 'Kawasan perbukitan timur laut' },
  { name: 'Apela Dua',       kecamatan: 'Ranowulu', code: '71.72.03.1008', coords: [1.4928874563, 125.1060875659], info: 'Kawasan dataran tinggi Apela' },
  { name: 'Apela Satu',      kecamatan: 'Ranowulu', code: '71.72.03.1009', coords: [1.5009917774, 125.0994236839], info: 'Kawasan dataran tinggi Apela' },
  { name: 'Pinasungkulan',   kecamatan: 'Ranowulu', code: '71.72.03.1010', coords: [1.5489891192, 125.1089838938], info: 'Kawasan perbukitan utara' },
  { name: 'Batuputih Atas',  kecamatan: 'Ranowulu', code: '71.72.03.1011', coords: [1.5812170374, 125.1447435474], info: 'Kawasan perbukitan tinggi utara' },
  { name: 'Batuputih Bawah', kecamatan: 'Ranowulu', code: '71.72.03.1012', coords: [1.5454970411, 125.1670211384], info: 'Kawasan permukiman Batuputih' },

  // Kecamatan Aertembaga (04) - 10 kelurahan
  { name: 'Pateten Satu',    kecamatan: 'Aertembaga', code: '71.72.04.1003', coords: [1.4442031437, 125.1974959243], info: 'Kawasan permukiman pesisir timur' },
  { name: 'Winenet Satu',    kecamatan: 'Aertembaga', code: '71.72.04.1004', coords: [1.4732862064, 125.1979902400], info: 'Kawasan perbukitan barat Aertembaga' },
  { name: 'Aertembaga Satu', kecamatan: 'Aertembaga', code: '71.72.04.1005', coords: [1.4481943737, 125.2059090799], info: 'Pusat kawasan Aertembaga' },
  { name: 'Tandurusa',       kecamatan: 'Aertembaga', code: '71.72.04.1006', coords: [1.4718741520, 125.2226519020], info: 'Kawasan perkebunan timur' },
  { name: 'Makawidey',       kecamatan: 'Aertembaga', code: '71.72.04.1007', coords: [1.4850491346, 125.2293751742], info: 'Kawasan dataran tinggi Aertembaga' },
  { name: 'Pinangunian',     kecamatan: 'Aertembaga', code: '71.72.04.1008', coords: [1.5019118752, 125.1934558626], info: 'Kawasan utara Aertembaga' },
  { name: 'Pateten Dua',     kecamatan: 'Aertembaga', code: '71.72.04.1011', coords: [1.4495300931, 125.1991242270], info: 'Kawasan permukiman Pateten Dua' },
  { name: 'Winenet Dua',     kecamatan: 'Aertembaga', code: '71.72.04.1012', coords: [1.4566263326, 125.1998726033], info: 'Kawasan Winenet bagian dua' },
  { name: 'Kasawari',        kecamatan: 'Aertembaga', code: '71.72.04.1013', coords: [1.5152977390, 125.2218517448], info: 'Kawasan perkebunan utara' },
  { name: 'Aertembaga Dua',  kecamatan: 'Aertembaga', code: '71.72.04.1014', coords: [1.4734044296, 125.2081916230], info: 'Kawasan Aertembaga bagian dua' },

  // Kecamatan Matuari (05) - 8 kelurahan
  { name: 'Tanjung Merah',        kecamatan: 'Matuari', code: '71.72.05.1001', coords: [1.4081737641, 125.1121404146], info: 'Kawasan industri & pelabuhan' },
  { name: 'Sagerat',              kecamatan: 'Matuari', code: '71.72.05.1002', coords: [1.4224328334, 125.0994873415], info: 'Kawasan permukiman barat pelabuhan' },
  { name: 'Manembo-nembo Atas',   kecamatan: 'Matuari', code: '71.72.05.1003', coords: [1.4385077425, 125.1082360681], info: 'Kawasan perumahan manembo-nembo' },
  { name: 'Manembo-nembo',        kecamatan: 'Matuari', code: '71.72.05.1007', coords: [1.4273893610, 125.1205172833], info: 'Kawasan permukiman manembo-nembo' },
  { name: 'Sagerat Weru Satu',    kecamatan: 'Matuari', code: '71.72.05.1011', coords: [1.4280504029, 125.1051050718], info: 'Kawasan Sagerat Weru bagian satu' },
  { name: 'Sagerat Weru Dua',     kecamatan: 'Matuari', code: '71.72.05.1012', coords: [1.4378945948, 125.0961058079], info: 'Kawasan Sagerat Weru bagian dua' },
  { name: 'Manembo-nembo Tengah', kecamatan: 'Matuari', code: '71.72.05.1013', coords: [1.4341807920, 125.1166130370], info: 'Kawasan tengah manembo-nembo' },
  { name: 'Tendeki',              kecamatan: 'Matuari', code: '71.72.05.1014', coords: [1.4570209940, 125.0968413048], info: 'Kawasan perbukitan barat Matuari' },

  // Kecamatan Girian (06) - 7 kelurahan
  { name: 'Girian Atas',      kecamatan: 'Girian', code: '71.72.06.1001', coords: [1.4433260333, 125.1259135249], info: 'Kawasan perbukitan timur kota' },
  { name: 'Girian Weru Satu', kecamatan: 'Girian', code: '71.72.06.1002', coords: [1.4383316491, 125.1269597034], info: 'Kawasan permukiman Girian' },
  { name: 'Girian Bawah',     kecamatan: 'Girian', code: '71.72.06.1003', coords: [1.4352546989, 125.1310521772], info: 'Kawasan pesisir timur Girian' },
  { name: 'Girian Permai',    kecamatan: 'Girian', code: '71.72.06.1004', coords: [1.4530495352, 125.1286306675], info: 'Kawasan perumahan Girian Permai' },
  { name: 'Girian Weru Dua',  kecamatan: 'Girian', code: '71.72.06.1005', coords: [1.4429455135, 125.1319900894], info: 'Kawasan permukiman Girian Weru' },
  { name: 'Girian Indah',     kecamatan: 'Girian', code: '71.72.06.1006', coords: [1.4505667593, 125.1365525974], info: 'Kawasan perumahan Girian Indah' },
  { name: 'Wangurer',         kecamatan: 'Girian', code: '71.72.06.1007', coords: [1.4374060304, 125.1371694771], info: 'Kawasan Wangurer pesisir' },

  // Kecamatan Maesa (07) - 8 kelurahan
  { name: 'Bitung Barat Satu', kecamatan: 'Maesa', code: '71.72.07.1001', coords: [1.4437393425, 125.1839113795], info: 'Kawasan permukiman pusat kota' },
  { name: 'Pakadoodan',        kecamatan: 'Maesa', code: '71.72.07.1002', coords: [1.4651391059, 125.1812536354], info: 'Kawasan permukiman atas' },
  { name: 'Bitung Barat Dua',  kecamatan: 'Maesa', code: '71.72.07.1003', coords: [1.4661367178, 125.1851481428], info: 'Kawasan permukiman padat' },
  { name: 'Bitung Tengah',     kecamatan: 'Maesa', code: '71.72.07.1004', coords: [1.4619995254, 125.1891146250], info: 'Kawasan pusat Kota Bitung' },
  { name: 'Bitung Timur',      kecamatan: 'Maesa', code: '71.72.07.1005', coords: [1.4444487714, 125.1926316680], info: 'Kawasan timur pusat kota' },
  { name: 'Kakenturan Satu',   kecamatan: 'Maesa', code: '71.72.07.1006', coords: [1.4652344219, 125.1921324006], info: 'Kawasan permukiman Kakenturan' },
  { name: 'Kekenturan Dua',    kecamatan: 'Maesa', code: '71.72.07.1007', coords: [1.4667480644, 125.1949795325], info: 'Kawasan permukiman Kekenturan' },
  { name: 'Pateten Tiga',      kecamatan: 'Maesa', code: '71.72.07.1008', coords: [1.4510148448, 125.1962228238], info: 'Kawasan Pateten bagian tiga' },

  // Kecamatan Lembeh Utara (08) - 10 kelurahan
  { name: 'Mawali',       kecamatan: 'Lembeh Utara', code: '71.72.08.1001', coords: [1.4338960194, 125.2373475927], info: 'Pulau Lembeh - Spot diving terkenal' },
  { name: 'Pintukota',    kecamatan: 'Lembeh Utara', code: '71.72.08.1002', coords: [1.4477072697, 125.2513231747], info: 'Pulau Lembeh - Kawasan tengah utara' },
  { name: 'Binuang',      kecamatan: 'Lembeh Utara', code: '71.72.08.1003', coords: [1.4912432881, 125.2643368043], info: 'Pulau Lembeh - Kawasan utara' },
  { name: 'Motto',        kecamatan: 'Lembeh Utara', code: '71.72.08.1004', coords: [1.4889351122, 125.2751715903], info: 'Pulau Lembeh - Kawasan timur utara' },
  { name: 'Lirang',       kecamatan: 'Lembeh Utara', code: '71.72.08.1005', coords: [1.5344779292, 125.2862845081], info: 'Pulau Lembeh - Ujung utara' },
  { name: 'Posokan',      kecamatan: 'Lembeh Utara', code: '71.72.08.1006', coords: [1.4764634062, 125.2675957360], info: 'Pulau Lembeh - Kawasan pesisir utara' },
  { name: 'Nusu',         kecamatan: 'Lembeh Utara', code: '71.72.08.1007', coords: [1.5096234958, 125.2743380030], info: 'Pulau Lembeh - Kawasan tengah jauh' },
  { name: 'Kareko',       kecamatan: 'Lembeh Utara', code: '71.72.08.1008', coords: [1.4744784807, 125.2541045908], info: 'Pulau Lembeh - Kawasan barat utara' },
  { name: 'Gunung Woka',  kecamatan: 'Lembeh Utara', code: '71.72.08.1009', coords: [1.4625178786, 125.2622314575], info: 'Pulau Lembeh - Kawasan perbukitan' },
  { name: 'Batukota',     kecamatan: 'Lembeh Utara', code: '71.72.08.1010', coords: [1.4622151970, 125.2477678982], info: 'Pulau Lembeh - Kawasan Batukota' }
];

/**
 * Calculate Haversine distance between two coordinates
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 * @returns {number} Distance in km
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Find nearest kelurahan from given coordinates
 * @param {number} lat @param {number} lng
 * @returns {object} Nearest kelurahan with distance property
 */
export function findNearestKelurahan(lat, lng) {
  let nearest = null, minDist = Infinity;
  bitungKelurahan.forEach(kel => {
    const d = calculateDistance(lat, lng, kel.coords[0], kel.coords[1]);
    if (d < minDist) { minDist = d; nearest = { ...kel, distance: d }; }
  });
  return nearest;
}

/**
 * Check if coordinates are within Kota Bitung boundaries
 * @param {number} lat @param {number} lng
 * @returns {boolean}
 */
export function isWithinBitung(lat, lng) {
  return lat >= 1.38 && lat <= 1.59 && lng >= 125.06 && lng <= 125.30;
}
