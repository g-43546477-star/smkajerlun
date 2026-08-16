(function () {
        var msLoc = "ms-MY";
        function tick() {
          var now = new Date(),
            el = document.getElementById("tarikh-masihi");
          if (el)
            el.textContent = new Intl.DateTimeFormat(msLoc, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(now);
          el = document.getElementById("tarikh-hijri");
          if (el) {
            try {
              el.textContent =
                new Intl.DateTimeFormat("ms-MY-u-ca-islamic-umalqura", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
                  .format(now)
                  .replace(/\s*H$/, "") + " H";
            } catch (e) {
              el.style.display = "none";
            }
          }
          el = document.getElementById("jam");
          if (el)
            el.textContent = new Intl.DateTimeFormat(msLoc, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            }).format(now);
        }
        tick();
        setInterval(tick, 1000);
        document.getElementById("thn").textContent = new Date().getFullYear();
      })();
;
cmsLoadPage("profil", "profil-blocks");
      cmsLoadLagu("profil", "lagu-mount");
      cmsLoadStaffOrg("org-chart-mount");
      cmsLoadStaffGrid("khas", "staff-khas", "card");
      cmsLoadStaffGrid("guru", "staff-guru", "list");
      cmsLoadStaffGrid("akp", "staff-akp", "list-akp");
      cmsLoadTakwim({
        akademikId: "takwim-akademik",
        cutiId: "takwim-cuti",
        calendarId: "takwim-aktiviti",
        activityListId: "takwim-aktiviti-list",
        monthHeadingId: "takwim-month-heading",
        summaryHeadingId: "takwim-summary-heading",
        prevId: "takwim-prev",
        nextId: "takwim-next",
      });
      cmsSetupSubtabs();
      cmsSetupInfoHashTabs();
      
      cmsLoadAuthNav();
