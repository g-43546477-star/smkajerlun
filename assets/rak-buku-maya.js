(function () {
  var gutenberg = 'https://www.gutenberg.org/ebooks/';
  var openstax = 'https://openstax.org/details/books/';
  var books = [
    ['Melayu Klasik','Hikayat Abdullah','Abdullah bin Abdulkadir Munsyi','https://ms.wikisource.org/wiki/Karya:Hikayat_Abdullah','Wikisumber'],['Melayu Klasik','Kisah Pelayaran Abdullah ke Kelantan','Abdullah bin Abdulkadir Munsyi','https://ms.wikisource.org/wiki/Kisah_Pelayaran_Abdullah_ke_Kelantan','Wikisumber'],['Melayu Klasik','Kisah Pelayaran Abdullah ke Jeddah','Abdullah bin Abdulkadir Munsyi','https://ms.wikisource.org/wiki/Kisah_Pelayaran_Abdullah_ke_Jeddah','Wikisumber'],['Melayu Klasik','Bustan al-Katibin','Raja Ali Haji','https://ms.wikisource.org/wiki/Bustan_al-Katibin','Wikisumber'],['Melayu Klasik','A Practical Malay Grammar','W. G. Shellabear','https://ms.wikisource.org/wiki/A_Practical_Malay_Grammar','Wikisumber'],
    ['Klasik','Pride and Prejudice','Jane Austen',gutenberg+'1342','Project Gutenberg'],['Klasik','Moby-Dick','Herman Melville',gutenberg+'2701','Project Gutenberg'],['Klasik','Frankenstein','Mary Wollstonecraft Shelley',gutenberg+'84','Project Gutenberg'],['Klasik','Dracula','Bram Stoker',gutenberg+'345','Project Gutenberg'],['Klasik','Jane Eyre','Charlotte Bronte',gutenberg+'1260','Project Gutenberg'],['Klasik','Wuthering Heights','Emily Bronte',gutenberg+'768','Project Gutenberg'],['Klasik','The Picture of Dorian Gray','Oscar Wilde',gutenberg+'174','Project Gutenberg'],['Klasik','Great Expectations','Charles Dickens',gutenberg+'1400','Project Gutenberg'],['Klasik','A Tale of Two Cities','Charles Dickens',gutenberg+'98','Project Gutenberg'],['Klasik','The Metamorphosis','Franz Kafka',gutenberg+'5200','Project Gutenberg'],['Klasik','The Importance of Being Earnest','Oscar Wilde',gutenberg+'844','Project Gutenberg'],['Klasik','Little Women','Louisa May Alcott',gutenberg+'514','Project Gutenberg'],
    ['Kanak-kanak','Alice’s Adventures in Wonderland','Lewis Carroll',gutenberg+'11','Project Gutenberg'],['Kanak-kanak','Peter Pan','J. M. Barrie',gutenberg+'16','Project Gutenberg'],['Kanak-kanak','The Wonderful Wizard of Oz','L. Frank Baum',gutenberg+'55','Project Gutenberg'],['Kanak-kanak','The Adventures of Tom Sawyer','Mark Twain',gutenberg+'74','Project Gutenberg'],['Kanak-kanak','Adventures of Huckleberry Finn','Mark Twain',gutenberg+'76','Project Gutenberg'],['Kanak-kanak','Anne of Green Gables','L. M. Montgomery',gutenberg+'45','Project Gutenberg'],['Kanak-kanak','The Secret Garden','Frances Hodgson Burnett',gutenberg+'17396','Project Gutenberg'],['Kanak-kanak','The Wind in the Willows','Kenneth Grahame',gutenberg+'289','Project Gutenberg'],['Kanak-kanak','Black Beauty','Anna Sewell',gutenberg+'271','Project Gutenberg'],['Kanak-kanak','The Velveteen Rabbit','Margery Williams',gutenberg+'11757','Project Gutenberg'],
    ['Pengembaraan','Treasure Island','Robert Louis Stevenson',gutenberg+'120','Project Gutenberg'],['Pengembaraan','Twenty Thousand Leagues under the Seas','Jules Verne',gutenberg+'164','Project Gutenberg'],['Pengembaraan','Around the World in Eighty Days','Jules Verne',gutenberg+'103','Project Gutenberg'],['Pengembaraan','The Call of the Wild','Jack London',gutenberg+'215','Project Gutenberg'],['Pengembaraan','The Lost World','Arthur Conan Doyle',gutenberg+'139','Project Gutenberg'],['Pengembaraan','Robinson Crusoe','Daniel Defoe',gutenberg+'521','Project Gutenberg'],['Pengembaraan','Gulliver’s Travels','Jonathan Swift',gutenberg+'829','Project Gutenberg'],['Pengembaraan','The Island of Doctor Moreau','H. G. Wells',gutenberg+'159','Project Gutenberg'],
    ['Sejarah','The Prince','Niccolo Machiavelli',gutenberg+'1232','Project Gutenberg'],['Sejarah','The Art of War','Sun Tzu',gutenberg+'132','Project Gutenberg'],['Sejarah','The Republic','Plato',gutenberg+'1497','Project Gutenberg'],['Sejarah','Narrative of the Life of Frederick Douglass','Frederick Douglass',gutenberg+'23','Project Gutenberg'],['Sejarah','Autobiography of Benjamin Franklin','Benjamin Franklin',gutenberg+'148','Project Gutenberg'],['Sejarah','The Federalist Papers','Alexander Hamilton et al.',gutenberg+'1404','Project Gutenberg'],['Sejarah','The Story of My Life','Helen Keller',gutenberg+'2397','Project Gutenberg'],
    ['Sains','On the Origin of Species','Charles Darwin',gutenberg+'1228','Project Gutenberg'],['Sains','Relativity: The Special and General Theory','Albert Einstein',gutenberg+'5001','Project Gutenberg'],
    ['STEM','Biology 2e','OpenStax',openstax+'biology-2e','OpenStax'],['STEM','Chemistry 2e','OpenStax',openstax+'chemistry-2e','OpenStax'],['STEM','Physics','OpenStax',openstax+'physics','OpenStax'],['STEM','College Physics 2e','OpenStax',openstax+'college-physics-2e','OpenStax'],['STEM','Astronomy 2e','OpenStax',openstax+'astronomy-2e','OpenStax'],['STEM','Anatomy and Physiology 2e','OpenStax',openstax+'anatomy-and-physiology-2e','OpenStax'],['STEM','Prealgebra 2e','OpenStax',openstax+'prealgebra-2e','OpenStax'],['STEM','Algebra and Trigonometry 2e','OpenStax',openstax+'algebra-and-trigonometry-2e','OpenStax'],['STEM','Calculus Volume 1','OpenStax',openstax+'calculus-volume-1','OpenStax'],['STEM','Introductory Statistics 2e','OpenStax',openstax+'introductory-statistics-2e','OpenStax']
  ];
  var shelf = document.getElementById('virtual-shelf');
  var status = document.getElementById('virtual-shelf-status');
  var search = document.getElementById('virtual-book-search');
  var currentCategory = 'Semua';
  var visibleCount = 12;
  var more = document.getElementById('virtual-shelf-more');
  function render() {
    var term = (search.value || '').toLowerCase().trim();
    var shown = books.filter(function (book) { return (currentCategory === 'Semua' || book[0] === currentCategory) && (!term || (book[1] + ' ' + book[2]).toLowerCase().indexOf(term) !== -1); });
    shelf.innerHTML = shown.slice(0, visibleCount).map(function (book) { return '<a class="virtual-book" data-category="' + book[0] + '" href="' + book[3] + '" target="_blank" rel="noopener noreferrer" aria-label="Baca ' + book[1] + ' oleh ' + book[2] + ' di ' + book[4] + ', dibuka dalam tab baharu"><small>' + book[0] + ' · ' + book[4] + '</small><b>' + book[1] + '</b><span>' + book[2] + '</span></a>'; }).join('');
    if (!shown.length) shelf.innerHTML = '<p class="pss-shelf-empty">Tiada buku sepadan. Cuba tajuk lain atau pilih kategori Semua.</p>';
    if (more) more.hidden = visibleCount >= shown.length;
    status.textContent = Math.min(visibleCount, shown.length) + ' daripada ' + shown.length + ' judul akses percuma dipaparkan' + (currentCategory === 'Semua' ? '.' : ' dalam kategori ' + currentCategory + '.');
  }
  document.querySelectorAll('.virtual-shelf-filter').forEach(function (button) { button.addEventListener('click', function () { currentCategory = button.dataset.category; visibleCount = 12; document.querySelectorAll('.virtual-shelf-filter').forEach(function (item) { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); }); render(); }); });
  document.querySelectorAll('.virtual-shelf-filter').forEach(function (button) { button.setAttribute('aria-pressed', String(button.classList.contains('active'))); });
  search.addEventListener('input', function () { visibleCount = 12; render(); });
  if (more) more.addEventListener('click', function () {
    var firstNew = visibleCount;
    visibleCount += 12;
    render();
    var nextBook = shelf.querySelectorAll('.virtual-book')[firstNew];
    if (nextBook) nextBook.focus();
  });
  render();
}());
