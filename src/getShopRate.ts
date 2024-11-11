import superagent from "superagent";
import * as cheerio from "cheerio";
import * as dotenv from "dotenv";
dotenv.config();

class Crowller {
  private url = process.env.SHOP_URL_PAGE || "";
  constructor() {
    this.getRawHtml();
  }
  async getRawHtml() {
    const result = await superagent.get(this.url);
    this.getJobInfo(result.text);
  }

  getJobInfo(html: string) {
    console.log(html);
    const $ = cheerio.load(html);
    const jobItems = $(".l-brand__rate__information__text.jsc-price-bid");
    jobItems.map((index, element) => {
      const companyName = $(element).find("p").text();
      console.log(companyName);
      console.log(typeof companyName);
    });
  }
}

const crowller = new Crowller();
