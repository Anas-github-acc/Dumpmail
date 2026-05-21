// import { marked } from "marked";
// import { convert } from "html-to-text";


export async function renderTemplate(subject, body, context) {

  function parseTemplate(template, context = {}) {
    let result = template;
    const innerTagRegex = /\{\{([^{}]*)\}\}|\[\[([^\[\]]*)\]\]/;

    function evaluateJS(code, ctx) {
        try {
            const keys = Object.keys(ctx);
            const values = Object.values(ctx);
            const fn = new Function(...keys, `return (${code});`);
            return fn(...values);
        } catch (error) {
            console.error(`Error evaluating JS: "${code}"`, error);
            return '';
        }
    }

    while (true) {
        const match = result.match(innerTagRegex);
        if (!match) break;

        const fullMatch = match[0];
        const mustacheContent = match[1];
        const bracketContent = match[2];

        if (mustacheContent !== undefined) {
            const evaluatedValue = evaluateJS(mustacheContent.trim(), context);
            result = result.replace(fullMatch, evaluatedValue);
        } 
        else if (bracketContent !== undefined) {
            const arrayItems = evaluateJS(`[${bracketContent}]`, context);
            
            if (Array.isArray(arrayItems) && arrayItems.length > 0) {
                const randomIndex = Math.floor(Math.random() * arrayItems.length);
                result = result.replace(fullMatch, arrayItems[randomIndex]);
            } else {
                result = result.replace(fullMatch, '');
            }
        }
    }

    // const html = marked(result);

    // const text = convert(html, {
    //     wordwrap: false,
    // });

    return result;
  }

  const renderedSubject = parseTemplate(subject, context);
  const renderedBody = parseTemplate(body, context);

  return {
    subject: renderedSubject,
    body: renderedBody,
    attachments: []
  };
}

// function buildFirstEmailFallback(lead) {
//   const attachments = env.RESUME_PATH
//     ? [
//         {
//           filename: env.RESUME_FILENAME || "Anas-Resume.pdf",
//           path: env.RESUME_PATH
//         }
//       ]
//     : [];q

//   return {
//     subject: `Inquiry: Engineering at ${lead.company} | Experience in Full-stack`,
//     body: `
// Hello ${lead.name},

// Hope you're having a great week.

// I came across ${lead.company} and wanted to reach out.

// I'm Anas, a CS student with ~6 months of production experience building and deploying full-stack systems.

// I've worked with TypeScript, Go, and Python, and built microservices and REST APIs using Node.js, React.js, and Next.js. I've handled end-to-end backend and deployment workflows - from API design and state management to integrating third-party services and deploying production systems on AWS using Terraform and CI/CD pipelines. I am also an open source contributor and have contributed to Vercel's Next.js.

// I'm currently looking for an internship or entry-level backend/DevOps role and would love to contribute to your team.

// Are you available for a brief chat sometime next week?

// Best regards,

// --
// Anas
// BTech Information Technology, 3rd Year
// Indian Institute of Information Technology, Vadodara
// Cell: (+91) 8081233871
// GitHub: https://github.com/Anas-github-acc
// LinkedIn: https://linkedin.com/in/anas-um
// `,
//     attachments
//   };
// }

// function buildFollowUpFallback(lead) {
//   return {
//     subject: `Re: Quick question, ${lead.name}`,
//     body: `
// Hi ${lead.name},

// Just following up once in case this got buried.

// Best,
// Anas
// `
//   };
// }

// export async function followUpEmail(lead) {
//   const fallback = buildFollowUpFallback(lead);

//   return generateEmailFromAI({
//     lead,
//     kind: "follow_up",
//     fallback
//   });
// }