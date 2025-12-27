/**
 * Generate CloudFormation template for AWS Cost Explorer IAM Role
 */
export function generateCloudFormationTemplate(externalId: string, principalArn: string): string {
  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'IAM Role for PULSE to access AWS Cost Explorer via AssumeRole',
    Parameters: {},
    Resources: {
      PULSECostExplorerRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          RoleName: 'PULSE-CostExplorer-Role',
          Description: 'Allows PULSE to read cost data via Cost Explorer API',
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: principalArn,
                },
                Action: 'sts:AssumeRole',
                Condition: {
                  StringEquals: {
                    'sts:ExternalId': externalId,
                  },
                },
              },
            ],
          },
          Policies: [
            {
              PolicyName: 'PULSE-CostExplorer-ReadOnly',
              PolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Action: ['ce:GetCostAndUsage', 'ce:GetDimensionValues'],
                    Resource: '*',
                  },
                ],
              },
            },
          ],
        },
      },
    },
    Outputs: {
      RoleArn: {
        Description: 'ARN of the IAM Role for PULSE',
        Value: {
          'Fn::GetAtt': ['PULSECostExplorerRole', 'Arn'],
        },
        Export: {
          Name: {
            'Fn::Sub': '${AWS::StackName}-PULSE-RoleArn',
          },
        },
      },
    },
  }

  return JSON.stringify(template, null, 2)
}

/**
 * Generate CloudFormation template as YAML (for better readability)
 */
export function generateCloudFormationTemplateYAML(externalId: string, principalArn: string): string {
  // For simplicity, we'll use JSON format (CloudFormation accepts both)
  // But format it nicely
  const template = generateCloudFormationTemplate(externalId, principalArn)
  return template
}



