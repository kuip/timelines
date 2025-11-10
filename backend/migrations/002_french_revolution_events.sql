-- French Revolution Events (1789-1799)
-- Timeline seconds calculation: seconds from Big Bang (13.8 billion years ago)
-- Current time (2025) = (13,800,000,000 - 0.00000000000227) * 31,536,000 ≈ 435,457,000,000,000,000 seconds
-- 1789 = 13.8 billion years - 236 years = (13,800,000,000 - 236) * 31,536,000 seconds
-- 1799 = 13.8 billion years - 226 years = (13,800,000,000 - 226) * 31,536,000 seconds

INSERT INTO events (
  timeline_seconds,
  precision_level,
  uncertainty_range,
  title,
  description,
  category,
  importance_score
) VALUES
  -- 1789 starts (January 1)
  (
    '435415424000000000.000000000',
    'day',
    '86400000000000.000000000',
    'French Revolution Begins',
    'The French Revolution begins with widespread discontent over taxes, food shortages, and Enlightenment ideas about liberty and equality.',
    'political',
    85
  ),
  -- May 5, 1789: Estates-General opens
  (
    '435415862400000000.000000000',
    'day',
    '86400000000000.000000000',
    'Estates-General Opens',
    'The Estates-General convenes at Versailles to address the fiscal crisis. The Third Estate declares itself the National Assembly.',
    'political',
    82
  ),
  -- June 20, 1789: Tennis Court Oath
  (
    '435416035200000000.000000000',
    'day',
    '86400000000000.000000000',
    'Tennis Court Oath',
    'Members of the Third Estate swear they will not disband until a constitution is created for France.',
    'political',
    80
  ),
  -- July 14, 1789: Storming of the Bastille
  (
    '435416208000000000.000000000',
    'day',
    '86400000000000.000000000',
    'Storming of the Bastille',
    'Parisians storm the Bastille fortress-prison, a symbol of royal tyranny. This day becomes the French national holiday (Bastille Day).',
    'political',
    95
  ),
  -- August 4, 1789: Abolition of feudalism
  (
    '435416467200000000.000000000',
    'day',
    '86400000000000.000000000',
    'Abolition of Feudalism',
    'The National Assembly votes to abolish feudalism and the feudal system, ending privileges of nobility and clergy.',
    'political',
    88
  ),
  -- August 26, 1789: Declaration of Rights of Man
  (
    '435416640000000000.000000000',
    'day',
    '86400000000000.000000000',
    'Declaration of the Rights of Man',
    'The National Assembly adopts the Declaration of the Rights of Man and of the Citizen, proclaiming universal human rights.',
    'political',
    92
  ),
  -- October 5-6, 1789: March on Versailles
  (
    '435417158400000000.000000000',
    'day',
    '86400000000000.000000000',
    'March on Versailles',
    'Thousands of Parisians, mostly women, march to Versailles and force King Louis XVI to accept the new constitutional order.',
    'political',
    85
  ),
  -- June 20-21, 1791: Flight to Varennes
  (
    '435432969600000000.000000000',
    'day',
    '86400000000000.000000000',
    'Flight to Varennes',
    'King Louis XVI and Queen Marie-Antoinette attempt to flee Paris but are arrested at Varennes and returned to Paris.',
    'political',
    80
  ),
  -- September 3, 1791: Constitution of 1791 adopted
  (
    '435433660800000000.000000000',
    'day',
    '86400000000000.000000000',
    'Constitution of 1791 Adopted',
    'France adopts its first written constitution, establishing a constitutional monarchy with separation of powers.',
    'political',
    83
  ),
  -- September 20, 1792: Battle of Valmy
  (
    '435438835200000000.000000000',
    'day',
    '86400000000000.000000000',
    'Battle of Valmy',
    'French revolutionary forces defeat Prussian and Austrian armies, saving the Revolution and establishing French military credibility.',
    'political',
    82
  ),
  -- September 22, 1792: First Republic declared
  (
    '435438921600000000.000000000',
    'day',
    '86400000000000.000000000',
    'First French Republic Declared',
    'The monarchy is abolished and the First French Republic is proclaimed, replacing the constitutional monarchy.',
    'political',
    90
  ),
  -- January 21, 1793: Execution of Louis XVI
  (
    '435453052800000000.000000000',
    'day',
    '86400000000000.000000000',
    'Execution of Louis XVI',
    'King Louis XVI is executed by guillotine, shocking European monarchies and deepening the Revolution.',
    'political',
    92
  ),
  -- September 5-6, 1793: September Massacres / Reign of Terror begins
  (
    '435470592000000000.000000000',
    'day',
    '86400000000000.000000000',
    'The Reign of Terror Begins',
    'The Committee of Public Safety, led by Robespierre, unleashes the Reign of Terror, executing thousands of perceived enemies.',
    'political',
    88
  ),
  -- July 28, 1794: Execution of Robespierre (Thermidorian Reaction)
  (
    '435501619200000000.000000000',
    'day',
    '86400000000000.000000000',
    'Fall of Robespierre',
    'Maximilien Robespierre and other radical leaders are executed, ending the Reign of Terror and leading to the Directory.',
    'political',
    85
  ),
  -- November 1799: Napoleon seizes power
  (
    '435543043200000000.000000000',
    'day',
    '86400000000000.000000000',
    'Coup of 18 Brumaire',
    'Napoleon Bonaparte seizes power in the Coup of 18 Brumaire, establishing the Consulate and effectively ending the French Revolution.',
    'political',
    90
  );
