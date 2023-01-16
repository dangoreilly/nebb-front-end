// Common functions for handling various League data
const axios = require('axios');

async function getLeagues(){
    // Function that sends a GET request to the server
    // GETs all leagues
    // Returns array of all leagues

    let requestAddress =  process.env.STRAPI + `api/leagues?sort=name`

    try{
          // Use the requestAddress to get team list from CMS
          var response = await axios.get(requestAddress);

          // Set up empty array to hold the processed teams
          // We want to transform the data from the CMS to make it a bit cleaner first
          let leagues = [];
          let _leagues = response.data.data;

          _leagues.forEach(element => {

                let attribs = element.attributes;

                let id = element.id;
                let leagueName = attribs.name;
                let grouping = attribs.Grouping;
                let url = attribs.url;

                // Form the league object and push it to the list
                leagues.push({id, leagueName, grouping, url});
                
          });

          // Now that we have the leagues, build a list of Groupings
          let groupings = []
          leagues.forEach(element => {

                // Check if the grouping of the current league has already been recorded
                if (!groupings.includes(element.grouping)){
                      // If it hasn't, add it to the list
                      groupings.push(element.grouping);
                }
          });

          console.log(leagues);

          // Return the list of leagues and groupings
          return {leagues, groupings};
    }
    catch(error) {
          // handle error
          console.error(error);
    }
}




async function getLeagueObject(leagueURL){
      //INPUT
      // url: string
      
      //METHOD
      // Make async calls to API for raw data
      // Combine processed data into a single object for easier UI comsumption
 
      //OUTPUT
      // <league> object

      //Initialise league object with fail flag
      let league = {"success": false};

      // let _fixtures = Promise.resolve(getFixtures(leagueURL));
      // let _teams = Promise.resolve(getTeams(leagueURL));
      let f = await getFixtures(leagueURL);
      let t = await getTeams(leagueURL);


      // Promise.all([_fixtures, _teams]).then((resolvedPromises) =>{
            // let f = resolvedPromises[0];
            // let t = resolvedPromises[1];

            // console.log("Fixtures: ", f.success);
            // console.log("Teams: ", t.success)
            
            if (f.success && t.success){

                  // If we have both a list of clubs matched to teams 
                  // and a list of games w/ the teams, we can match them for rendering later 
                  let games = matchClubsAndTeams(f.games, t.teams);

                  league = {
                        "id": f.id,
                        "league": f.league,
                        "games": games,
                        "teams": t.teams,
                        "success": true
                  }


            }

      // });
      // console.log(league);
      return league;
}

function matchClubsAndTeams(fixtures, teams){
      //INPUT
      // fixtures: array of fixture objects, with <homeTeam and <awayTeam> properties
      // teams: array of {team, club} objects
      
      //METHOD
      // For each fixture in <fixtures>, matches the home and away team names with a club.
      // Popluates a new <league> array that replaces the home and away teams with
      // {team, club} objects
 
      //OUTPUT
      // <games> object

      let games = [];

      fixtures.forEach(fixture => {

            //Don't mutate the original
            // let f = Object.create(fixture);

            fixture.homeTeam = getClubForTeam(fixture.homeTeam, teams);
            fixture.awayTeam = getClubForTeam(fixture.awayTeam, teams);

            games.push(fixture);

      })

      return games;


}

function getClubForTeam(searchTeam, teams){
      //INPUT
      // searchTeam: string
      // teams: array of {team, club} objects
      
      //METHOD
      // loop through <teams> for a match
 
      //OUTPUT
      // {team, club} object


      //If no match is found, just call the club unknown
      let searchResult = {"teamName": searchTeam, "clubName": "unknown"};;

      teams.forEach(t => {

            if (t.teamName == searchTeam){
                  searchResult = t;
            }

      })

      return searchResult;
}



function parseDate(_date){
      //Takes in a date string in the format YYYY-MM-DD
      //Returns date string in the format DD/MM/YYYY

      let parts =_date.split("-");
      
      return `${parts[2]}/${parts[1]}/${parts[0]}`

}

async function getTeams(leagueURL){
      // Function that sends a GET request to the server
      // GETs all Teams related to leagueURL
      // Returns array of all matching teams, and 'Success' flag
      // Success = true if array size is greater than 0

      // FILTER: for the league with the matching URL
      // POPULATE[TEAMS]: Include data about the related teams
      // POPULATE[1]=CLUB: For each team, include data about the related club
      let requestAddress =  process.env.STRAPI + `api/leagues?filters[url][$eq]=${leagueURL}&populate[teams][populate][1]=club`

      try{
            // Use the requestAddress to get team list from CMS
            var response = await axios.get(requestAddress);

            // Set up empty array to hold the processed teams
            // We want to transform the data from the CMS to make it a bit cleaner first
            let teams = [];
            let _teams = response.data.data[0].attributes.teams.data;

            _teams.forEach(element => {

                  let attribs = element.attributes;

                  let id = element.id;
                  let teamName = attribs.Name;
                  let clubName = attribs.club.data.attributes.Name;

                  //Pair the teamName and ClubName into an objectm and add to the list
                  teams.push({id, teamName, clubName});
                  
            });

            // console.log(teams);

            // Return an object with both games and the league name to be consumed by the view engine
            return responseObject= {
                  "teams": teams,
                  "success": teams.length > 0
            };
      }
      catch(error) {
            // handle error
            console.error(error);
            //Return an object indicating a failure
            return {"success": false};
      }
}

async function getFixtures(leagueURL){
      // Function that sends a GET request to the server
      // GETs all fixtures related to leagueURL
      // Returns object of all matching fixtures, league name, and 'Success' flag
      // Success = true if array size is greater than 0

      let requestAddress =  process.env.STRAPI + `api/fixtures?filters[league][url][$eq]=${leagueURL}&populate=*&pagination[pageSize]=100&sort=Date%3Aasc`
      // console.log(requestAddress)

      try{
            // Use the requestAddress to get fixtures list from CMS
            var response = await axios.get(requestAddress);
            
            // Set up empty array to hold the processed fixtures
            // We want to transform the data from the CMS to make it a bit cleaner first
            let fixtures = [];
            let _fixtures = response.data.data;
            // console.log(_fixtures[0]);
            
            // Use the first fixture to grab the name and ID of the league
            let leagueName = _fixtures[0].attributes.league.data.attributes.name;
            let leagueId = _fixtures[0].id;

            _fixtures.forEach(element => {

                  let attribs = element.attributes;

                  let fixtureInfo = 
                  {
                        "id":element.id,
                        "ISO_date": attribs.Date,
                        "date":parseDate(attribs.Date),
                        // "parsedDate": function(){
                        //       let parts =this.date.split("/");
                        //       return `${parts[2]}-${parts[1]}-${parts[0]}`
                        // },
                        // "homeClub": "East Coast Cavaliers",
                        "homeTeam": attribs.team.data.attributes.Name,
                        "homeScore": attribs.homeTeamScore || "-",
                        "homePoints": attribs.homeTeamPointsAwarded || "-",
                        "awayTeam": attribs.awayTeam.data.attributes.Name,
                        "awayScore": attribs.awayTeamScore || "-",
                        "awayPoints": attribs.awayTeamPointsAwarded || "-",
                        "homeWin": attribs.homeTeamScore > attribs.awayTeamScore,  // Quick check for the winner
                        "posted": attribs.homeTeamPointsAwarded + attribs.awayTeamPointsAwarded > 0,  // If points were awarded to either team, then the fixture should be displayed
                        "pastDue": attribs.Date < Date.now() && !this.posted // Flag for seeing if the fixture is in the past, but hasn't been updated
                  }
                  // console.log(fixtureInfo);

                  fixtures.push(fixtureInfo);
                  
            });

            // Return an object with both games and the league name to be consumed by the view engine
            let responseObject= {
                  "id": leagueId,
                  "league": leagueName,
                  "games": fixtures,
                  "success": fixtures.length > 0
            };
            // console.log(responseObject)
                  
            return responseObject;
            
      }
      catch(error) {
            // handle error
            console.error(error);
            //Return an object indicating a failure
            return {"success": false};
      }
}

module.exports = {getLeagues, getLeagueObject, getTeams, getFixtures}