export type SubCategory = string;

export interface VisaCategory {
  name: string;
  subCategories: SubCategory[];
}

export interface VisaCenterConfig {
  name: string;
  categories: VisaCategory[];
}

export interface ToCountryConfig {
  name: string;
  centers: VisaCenterConfig[];
}

export interface FromCountryConfig {
  name: string;
  toCountries: ToCountryConfig[];
}

export const VISA_ROUTE_MASTER: FromCountryConfig[] = [
  {
    name: 'United Arab Emirates',
    toCountries: [
      {
        name: 'Portugal',
        centers: [
          {
            name: 'Portugal Visa Application Center - Dubai',
            categories: [
              { name: 'Long Term Visa', subCategories: ['National Visa (Category D/E) Long Term'] },
              { name: 'Short Stay Visa', subCategories: ['Business', 'Tourism', 'Transit'] }
            ]
          },
          {
            name: 'Portugal Visa Application Center - Abu Dhabi',
            categories: [
              { name: 'Long Term Visa', subCategories: ['National Visa (Category D/E) Long Term'] },
              { name: 'Short Stay Visa', subCategories: ['Business', 'Tourism', 'Transit'] }
            ]
          }
        ]
      },
      {
        name: 'Latvia',
        centers: [
          {
            name: 'Portugal Visa application center-Dubai',
            categories: [
              { name: 'Long Stay', subCategories: ['Long Stay / Work Permit'] }
            ]
          },
          {
            name: 'Portugal Visa Application Center - Abu Dhabi',
            categories: [
              { name: 'Long Stay', subCategories: ['Long Stay / Work Permit'] }
            ]
          }
        ]
      },
      {
        name: 'Czech Republic',
        centers: [
          {
            name: 'Czech visa application center- Abu Dhabi',
            categories: [
              { name: 'Seasonal Employment', subCategories: ['Season-Employment'] }
            ]
          },
          {
            name: 'Czech Visa application center-Dubai',
            categories: [
              { name: 'Seasonal Employment', subCategories: ['Season-Employment'] }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'India',
    toCountries: [
      {
        name: 'Slovakia',
        centers: [
          'Visa Application Centre VFS Global Services Pvt. Ltd. - Mumbai',
          'Visa Application Centre VFS Global Services Pvt. Ltd .- Chennai',
          'Visa Application Centre VFS Global Services Pvt. Ltd .- Kolkata',
          'Visa Application Centre VFS Global Services Pvt. Ltd. - Bangalore',
          'Visa Application Centre VFS Global Services Pvt. Ltd .- Delhi'
        ].map(center => ({
          name: center,
          categories: [
            { name: 'Long Stay', subCategories: ['Employment'] }
          ]
        }))
      },
      {
        name: 'Bulgaria',
        centers: [
          'Bulgaria Visa Application Center - New Delhi',
          'Bulgaria Visa Application Center - Mumbai',
          'Bulgarian Visa Application Center - Kolkata - VAC',
          'Bulgaria Visa Application Centre - Jalandhar',
          'Bulgaria Visa Application Center - Bangalore',
          'Bulgaria Visa Application Centre - Chandigarh',
          'Bulgaria Visa Application Centre - Pune',
          'Bulgaria Visa Application Centre - Cochin',
          'Bulgaria Visa Application Centre - Goa',
          'Bulgaria Visa Application Centre - Ahmedabad',
          'Bulgaria Visa Application Centre - Puducherry',
          'Bulgaria Visa Application Centre - Jaipur',
          'Bulgaria Visa Application Centre - Hyderabad',
          'Bulgaria Visa Application Centre - Chennai',
          'Bulgaria Visa Application Centre - Haryana',
          'Bulgaria Visa Application Center - Gurugram'
        ].map(center => ({
          name: center,
          categories: [
            { name: 'Schengen Visa- Less than 90 days', subCategories: ['Airport Transit Visa', 'Sports/ Cultural/ Artistic/ Scientific visa/ Education Visa', 'Private Visit', 'Tourist Visa', 'Conference Visa'] },
            { name: 'Non Schengen Visa- Less than 90 Days', subCategories: [] },
            { name: 'Business', subCategories: ['Business Visa'] },
            { name: 'Seasonal worker', subCategories: ['Seasonal worker'] },
            { name: 'D visa', subCategories: ['Long Stay D visa'] }
          ]
        }))
      },
      {
        name: 'Latvia',
        centers: [
          {
            name: 'Latvia Visa Application Centre - India',
            categories: [
              { name: 'Default_Latvia_India', subCategories: ['Student Long Term'] },
              { name: 'Short Stay', subCategories: ['Tourist', 'Business', 'Visiting Family and friends', 'Airport Transit', 'Medical Treatment', 'Seafrerer', 'Conference'] },
              { name: 'Long Stay', subCategories: ['Resident Permit', 'Student', 'Employment'] }
            ]
          }
        ]
      },
      {
        name: 'Germany',
        centers: [
          'Bangalore - Germany Visa Application Centre',
          'Cochin - Visa Application Centre',
          'Mumbai - Consulate General Of Germany'
        ].map(center => ({
          name: center,
          categories: [
            { name: 'National Visa (stay of more than 90 days): Employment', subCategories: ['Speciality Cook', 'Au Pair'] }
          ]
        }))
      }
    ]
  },
  {
    name: 'Angola',
    toCountries: [
      {
        name: 'Portugal',
        centers: [
          {
            name: 'Portugal Visa Application Center-Luanda',
            categories: [
              { name: 'Visto Nacional', subCategories: ['Visto Nacional (National visa)'] },
              { name: 'Visto Schengen', subCategories: ['Visto Schengen (Schengen Visa)'] }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Saudi Arabia',
    toCountries: [
      {
        name: 'Portugal',
        centers: [
          'Portugal Visa application center-Riyadh',
          'Portugal Visa application center-Jeddah',
          'Portugal Visa Application Centre- Dammam'
        ].map(center => ({
          name: center,
          categories: [
            { name: 'Short Stay', subCategories: ['Standard Section', 'Premium Section'] },
            { name: 'Long Stay Visa', subCategories: [
              'Job Seekers - D Visa',
              'Category D E',
              'RESIDENCE VISA FOR EMPLOYMENT',
              'RESIDENCE VISA FOR SELF-EMPLOYMENT OR IMMIGRANT ENTREPRENEUR AND STARTUP VISA',
              'RESIDENCE VISA FOR TEACHING, HIGHLY QUALIFIED AND CULTURAL ACTIVITY OR HIGHLY QUALIFIED ACTIVITIES CARRIED OUT BY SALARIED EMPLOYEES',
              'RESIDENCY VISA FOR RESEARCH, STUDY, STUDENTS EXCHANGE, INTERNSHIP AND VOLUNTARY WORK',
              'RESIDENCY VISA FOR FAMILY REUNIFICATION',
              'RESIDENCY VISA FOR ESTABLISHMENT OF RESIDENCE FOR PENSIONERS, RELIGIOUS PURPOSES OR PEOPLE LIVING ON THEIR OWN INCOME',
              'RESIDENCY VISA FOR ACCOMPANYING A FAMILY MEMBER HOLDING A RESIDENCY VISA',
              'RESIDENCY VISA FOR REMOTE WORK - "DIGITAL NOMADS"',
              'TEMPORARY STAY VISA FOR MEDICAL TREATMENT',
              'TEMPORARY STAY VISA FOR THE TRANSFER OF NATIONAL CITIZENS FROM STATE PARTIES TO THE WORLD TRADE ORGANIZATION, FOR SERVICE PROVIDING OR PROFESSIONAL TRAINING PURPOSES',
              'TEMPORARY STAY VISA FOR SELF-EMPLOYMENT',
              'TEMPORARY STAY VISA FOR SCIENTIFIC RESEARCH, ACADEMIC TEACHING OR HIGHLY QUALIFIED ACTIVITY',
              'TEMPORARY STAY VISA FOR AMATEUR SPORTS',
              'TEMPORARY STAY VISA FOR STUDY PROGRAM AT AN EDUCATIONAL ESTABLISHMENT, STUDENT EXCHANGE PROGRAM, UNPAID PROFESSIONAL INTERNSHIP, VOLUNTARY WORK AND INTERNATIONAL COMMITMENTS RELATED TO THE FREE MOVEME',
              'TEMPORARY STAY VISA FOR ACCOMPANYING A FAMILY MEMBER UNDERGOING MEDICAL TREATMENT',
              'TEMPORARY STAY VISA FOR SEASONAL WORK - 90 days to 270 days',
              'TEMPORARY STAY VISA FOR ACADEMIC OR PROFESSIONAL TRAINING COURSE',
              'TEMPORARY STAY VISA FOR ACCOMPANYING A FAMILY MEMBER HOLDING A TEMPORARY STAY VISA',
              'TEMPORARY STAY VISA FOR REMOTE WORK - "DIGITAL NOMADS"'
            ] },
            { name: 'Long Stay', subCategories: ['JOB SEEKER VISA UP TO 120 DAYS'] }
          ]
        }))
      }
    ]
  },
  {
    name: 'Senegal',
    toCountries: [
      {
        name: 'Portugal',
        centers: [
          {
            name: 'Portugal Visa application center-Dakar',
            categories: [
              { name: 'VISA PORTUGAL', subCategories: ['Schengen', 'Famille Citoyen UE (Court sejour et Regroupement)', 'test do not book appointment here', 'Visas nationaux long sejour (residence et sejour temporaire)'] }
            ]
          }
        ]
      }
    ]
  },
  {
    name: 'Guinea-Bissau',
    toCountries: [
      {
        name: 'Portugal',
        centers: [
          {
            name: 'Portugal Visa application center - Bissau',
            categories: [
              { name: 'National Visas', subCategories: ['Study Visa', 'Family Reunion Visa', 'Medical Treatment Visa', 'EU Family Member Visa (Directive 38)', 'test dO not book', 'Other Types of National Visa'] },
              { name: 'Schengen Visas', subCategories: ['Tourism/Business/Other (short stay)'] }
            ]
          }
        ]
      }
    ]
  }
];
