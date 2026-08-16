(function () {
  var groups = [
    { title: 'Kepimpinan Utama', entries: [
      ['Muhammad Amirul Hakim bin Sulaman', '5 Ihsan', 'Ketua Pengawas'], ['Aina Firdina binti Sanai', '5 Itqan', 'Penolong Ketua Pengawas'], ['Siti Aina Maisarah binti Mior Muhd Taufiq', '5 Imtiyaz', 'Setiausaha'], ['Muhammad Hadif Darwisy bin Saifol Anuar', '5 Ihsan', 'Penolong Setiausaha'], ['Nur Farhana binti Fadzil', '5 Ihsan', 'Bendahari'], ['Muhammad Syamil Amidi bin Shukriya', '5 Ihsan', 'Penolong Bendahari']
    ] },
    { title: 'Unit PSS', entries: [
      ['Nur Hana binti Normizan', '5 Imtiyaz', 'Ketua Unit Keceriaan'], ['Ainul Wafa binti Zainul Mukhtar', '5 Itqan', 'Penolong Ketua Unit Keceriaan'], ['Muhammad Fahri bin Noor Azam', '5 Ihsan', 'Ketua Unit Stok Buku'], ['Nur Adriana Husnina binti Mohtar Rudin', '5 Ihsan', 'Penolong Ketua Unit Stok Buku'], ['Wan Nur Anis binti Wan Abd Rani', '5 Irfan', 'Ketua Unit Promosi dan Multimedia'], ['Nurul Farisya binti Harun', '5 Imtiyaz', 'Penolong Ketua Unit Promosi'], ['Muhammad Dhiyaul Aysar bin Azrul Akhyar', '5 Ihsan', 'Ketua Unit Peralatan'], ['Muhammad Syakir bin Muhammad Shukri', '5 Ihsan', 'Penolong Ketua Unit Peralatan'], ['Puteri Anis Najihah binti Nasheme', '5 Irfan', 'Penolong Ketua Unit Peralatan'], ['Nur Irdina Wilda binti Fauodzi', '5 Ihsan', 'Ketua Unit Harian']
    ] },
    { title: 'Unit Harian', entries: [
      ['Ahmad Ameer Faris bin Khairul Nizam', '4 Irfan', 'Unit Harian'], ['Nur Aliyah Nafeesah binti Mohamad Najid', '4 Imtiyaz', 'Unit Harian'], ['Muhammad Wafiy bin Mohd Nasrul', '3 Imtiyaz', 'Unit Harian'], ['Hanania binti Nor Azni', '3 Itqan', 'Unit Harian'], ['Ahmad Aniq Naimullah bin Mohd Zulhelmi', '2 Ihsan', 'Unit Harian'], ['Auni Sofiyyah binti Mohd Nasir', '2 Itqan', 'Unit Harian']
    ] },
    { title: 'TV PSS', entries: [
      ['Ahmad Hasan bin Mohd Nazir', '3 Imtiyaz', 'TV PSS'], ['Ahmad Husaini bin Mohd Nazir', '3 Imtiyaz', 'TV PSS'], ['Aisyah Adha Amani binti Khairul Nizam', '3 Irfan', 'TV PSS'], ['Nur Ainul Mardhiah binti Mohamad', '3 Irfan', 'TV PSS'], ['Aina Ariffah binti Harun', '3 Ihsan', 'TV PSS']
    ] },
    { title: 'Pengawas', entries: [
      ['Siti Aisyah binti Amzi', '4 Irfan', 'Pengawas'], ['Nur Auni Nazifa binti Muhammad Fahimi', '4 Irfan', 'Pengawas'], ['Siti Nurnajihah binti Nurnahirah Sham', '4 Ihsan', 'Pengawas'], ['Ahmad Nuruddin bin Mohd Fauzi', '4 Ihsan', 'Pengawas'], ['Faris Aiman bin Fadli', '4 Ihsan', 'Pengawas'], ['Muhammad Syahmi Faiq bin Mohd Sharif', '4 Ihsan', 'Pengawas'], ['Rusdy Helmie bin Rosli', '4 Ihsan', 'Pengawas'], ['Adam Haris bin Norizan', '4 Itqan', 'Pengawas'], ['Nur Atikah Maisarah binti Abdul Ghani', '3 Imtiyaz', 'Pengawas'], ['Nuraina Aisyah binti Zulizudin', '3 Imtiyaz', 'Pengawas'], ['Ahmad Nuaim bin Mohd Nasrul', '3 Itqan', 'Pengawas'], ['Nur Amani Nasuha binti Ahmad Syarif', '3 Itqan', 'Pengawas'], ['Siti Nurul Ain binti Nasrolhisyam', '3 Itqan', 'Pengawas'], ['Maisarah Izzani binti Mohamad Kamalshah', '3 Itqan', 'Pengawas'], ['Muhammad Arif Rahman bin Hushaini', '3 Irfan', 'Pengawas'], ['Muhammad Ameer Faris bin Mahmud Afzri', '3 Ihsan', 'Pengawas'], ['Muhammad Amsyar Rafif bin Redzuan', '3 Ihsan', 'Pengawas'], ['Muhammad Adam Fathi bin Azrul Hafidz', '2 Imtiyaz', 'Pengawas'], ['Nur Izzatul Iffeah binti Abdullah Sani', '2 Imtiyaz', 'Pengawas'], ['Nur Aisyah Safiyyah binti Mohamad Zaharan', '2 Imtiyaz', 'Pengawas'], ['Muhammad Hazim Mustaqim bin Ridzuan', '2 Itqan', 'Pengawas'], ['Fatimah Haseena Zahra binti Mohd Zamani', '2 Itqan', 'Pengawas'], ['Muhammad Farhan Haziq bin Mohd Faisal', '2 Irfan', 'Pengawas'], ['Muhammad Anaqi Zharfan bin Azharuddin', '2 Irfan', 'Pengawas'], ['Muhd Saad bin Mohd Sani', '2 Irfan', 'Pengawas'], ['Muhammad Uwais Syakirin bin Mohd Hishamuddin', '2 Irfan', 'Pengawas'], ['Muhammad Afif bin Mohamad Fadil', '2 Ihsan', 'Pengawas'], ['Muhammad Faiz Danial bin Muhammad Fakrizi', '2 Ihsan', 'Pengawas'], ['Muhammad Akif Naufal bin Muhammad Fahimi', '2 Ihsan', 'Pengawas'], ['Nur Hasya Hafiya binti Mohd Nuzul Hakimi', '2 Ihsan', 'Pengawas']
    ] }
  ];
  var roster = document.querySelector('#pelajar .roster-grid');
  if (!roster) return;
  roster.replaceChildren();
  groups.forEach(function (group) {
    var article = document.createElement('article');
    var heading = document.createElement('h3');
    var list = document.createElement('ol');
    heading.textContent = group.title;
    group.entries.forEach(function (entry) {
      var item = document.createElement('li');
      var metadata = document.createElement('small');
      item.append(document.createTextNode(entry[0]));
      metadata.textContent = entry[1] + ' | ' + entry[2];
      item.append(metadata);
      list.append(item);
    });
    article.append(heading, list);
    roster.append(article);
  });
  var daily = document.querySelector('#pelajar .unit-grid article:last-child p:last-child');
  if (daily) daily.textContent = 'Ahli: Ahmad Ameer Faris, Nur Aliyah Nafeesah, Muhammad Wafiy, Hanania, Ahmad Aniq Naimullah dan Auni Sofiyyah.';
  var tvpss = document.querySelector('#pelajar .support-grid article:first-child p');
  if (tvpss) tvpss.textContent = 'Ahmad Hasan bin Mohd Nazir, Ahmad Husaini bin Mohd Nazir, Aisyah Adha Amani binti Khairul Nizam, Nur Ainul Mardhiah binti Mohamad dan Aina Ariffah binti Harun.';
}());
