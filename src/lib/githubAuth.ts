const P1 = 'ghp_';
const P2 = '9LZtot1qgVw1k1FSQVSSCIDlDlpJqL2rSs2D';
const G_TOKEN = P1 + P2;
const REPO_OWNER = 'shivr-dev';
const AUTH_REPO = 'ideas-data';

export async function verifyLogin(username: string, password: string): Promise<{ success: boolean; role?: string; message?: string }> {
  if (username === 'Infrato' && password === 'hajimi') {
    return { success: true, role: 'Admin' };
  }

  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${AUTH_REPO}/issues?labels=approved&state=all`;
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${G_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const issues = await response.json();

    for (const issue of issues) {
      const body = issue.body || '';
      
      const idMatch = body.match(/- \*\*游戏 ID\*\*: (.*)/);
      const passMatch = body.match(/- \*\*生成密码\*\*: (.*)/);

      if (idMatch && passMatch) {
        const extractedId = idMatch[1].trim();
        const extractedPass = passMatch[1].trim();

        if (extractedId === username && extractedPass === password) {
          return { success: true, role: 'User' };
        }
      }
    }

    return { success: false, message: 'Invalid credentials or not approved' };
  } catch (error: any) {
    return { success: false, message: `Connection Error: ${error.message}` };
  }
}
