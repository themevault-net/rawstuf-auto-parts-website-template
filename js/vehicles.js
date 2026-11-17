/* Rawstuf vehicle list: feeds the Year / Make / Model finder and the fit check on product cards.
   Make -> model -> [first year, last year]. Replace with your own catalogue (a CMS writes this file, or sets
   window.RS_VEHICLES before js/main.js runs). Product cards list what they fit in data-fits, e.g.
   data-fits="Toyota/Corolla/2014-2019; Honda/Civic/2016-2021", or data-fits="all" for universal items such as tools. */
window.RS_VEHICLES = {
    "BMW":        { "1 Series": [2011, 2025], "3 Series": [2012, 2025], "5 Series": [2010, 2025], "X3": [2011, 2025] },
    "Ford":       { "Fiesta": [2008, 2023], "Focus": [2011, 2025], "Ranger": [2012, 2025], "Transit": [2014, 2025] },
    "Honda":      { "Accord": [2008, 2022], "Civic": [2012, 2025], "CR-V": [2012, 2025], "Jazz": [2008, 2025] },
    "Toyota":     { "Camry": [2012, 2025], "Corolla": [2008, 2025], "Hilux": [2005, 2025], "RAV4": [2013, 2025] },
    "Volkswagen": { "Golf": [2012, 2025], "Passat": [2010, 2025], "Polo": [2009, 2025], "Tiguan": [2016, 2025] }
};
